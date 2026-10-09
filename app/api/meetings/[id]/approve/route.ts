import { approvalSchema } from "@/lib/schemas";
import { approve, getMeeting } from "@/lib/db";
import { ApiError, failure, jsonBody, mutationGuard } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationGuard(request);
    const { id } = await params;
    const data = approvalSchema.parse(await jsonBody(request));
    const meeting = await getMeeting(id);
    if (!meeting) throw new ApiError(404, "Meeting not found.");
    if (meeting.review_state === "approved")
      return Response.json({ ok: true, already_approved: true });
    const indices = new Set<number>();
    for (const t of data.tasks) {
      const original = meeting.analysis.proposed_tasks[t.proposal_index];
      if (
        !original ||
        indices.has(t.proposal_index) ||
        original.transcript_quote !== t.transcript_quote
      )
        throw new ApiError(
          422,
          "Invalid proposal reference or changed evidence.",
        );
      indices.add(t.proposal_index);
    }
    await approve(id, data.tasks);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
