import type { SyncStep } from "@/lib/meet-sync-client";
import { createHash } from "node:crypto";
import { apiAuth } from "@/lib/auth";
import { extract } from "@/lib/ai";
import { fetchGoogleMeeting } from "@/lib/google-workspace";
import { sendMeetingRecap, recapEmailPayload } from "@/lib/email-service";
import {
  claimMeetSync,
  loadGoogleRefreshToken,
  saveMeetSyncResult,
  stageMeetEmail,
  finishMeetSync,
  failMeetSync,
  type MeetSyncJob,
} from "@/lib/google-integration-store";
import { meetSyncSchema, workspaceAnalysisSchema } from "@/lib/workspace-types";
import { ApiError, failure, jsonBody, mutationGuard } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 300;
async function runSync(request: Request, onProgress: (step: SyncStep) => void) {
  let job: MeetSyncJob | undefined;
  let userId: string | undefined;
  try {
    mutationGuard(request);
    const { user } = await apiAuth();
    userId = user.id;
    const input = meetSyncSchema.parse(await jsonBody(request));
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
      throw new ApiError(503, "Configure Resend before syncing meetings.");
    onProgress("fetching");
    const source = await fetchGoogleMeeting(
      await loadGoogleRefreshToken(user.id),
      input,
    );
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          source.calendarId,
          source.eventId,
          source.documentId,
          source.transcript,
        ]),
      )
      .digest("hex");
    job = await claimMeetSync(user.id, fingerprint, source);
    if (job.status === "sent")
      return Response.json(
        {
          ok: true,
          cached: true,
          meetingId: job.meeting_id,
          version: job.meeting_version,
          email: { status: "accepted", count: job.email_ids?.length ?? 0 },
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    if (!job.analysis) {
      onProgress("analyzing");
      const analysis = workspaceAnalysisSchema.parse(
        await extract(
          job.source.transcript,
          job.source.meetingDate,
          job.source.attendees,
        ),
      );
      job = await saveMeetSyncResult(user.id, job, analysis);
    }
    if (!job.analysis || !job.meeting_id)
      throw new Error("Sync draft was not saved.");
    onProgress("dispatching");
    const emailData = {
      dispatchId: job.id,
      title: job.source.title,
      meetingDate: job.source.meetingDate,
      documentUrl: job.source.documentUrl,
      analysis: job.analysis,
    };
    job = await stageMeetEmail(
      user.id,
      job,
      job.email_payload ?? recapEmailPayload(emailData),
    );
    const emailIds = await sendMeetingRecap(
      emailData,
      job.source.attendees,
      job.email_payload!,
    );
    await finishMeetSync(user.id, job, emailIds);
    return Response.json(
      {
        ok: true,
        cached: false,
        meetingId: job.meeting_id,
        version: job.meeting_version,
        reviewState: "pending",
        email: { status: "accepted", count: emailIds.length },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (job && userId && job.status !== "sent") {
      try {
        await failMeetSync(userId, job);
      } catch {
        console.error("Could not release Meet sync lease.");
      }
    }
    if (job?.meeting_id)
      return Response.json(
        {
          ok: false,
          meetingId: job.meeting_id,
          version: job.meeting_version,
          proposalsSaved: true,
          email: { status: "retry_required" },
          error:
            error instanceof ApiError
              ? error.message
              : "The draft is saved, but email dispatch was not confirmed. Retry the same sync request.",
        },
        {
          status: error instanceof ApiError ? error.status : 502,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("accept")?.includes("application/x-ndjson"))
    return runSync(request, () => {});
  const encoder = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (packet: unknown) => {
        if (disconnected) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(packet) + "\n"));
        } catch {
          disconnected = true;
        }
      };
      try {
        const response = await runSync(request, (step) =>
          send({ type: "progress", step }),
        );
        send({
          type: "result",
          status: response.status,
          result: await response.json(),
        });
      } catch {
        send({
          type: "result",
          status: 503,
          result: {
            error:
              "Sync could not be confirmed. Retry the same meeting to resume safely.",
          },
        });
      } finally {
        if (!disconnected) controller.close();
      }
    },
    cancel() {
      disconnected = true;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
