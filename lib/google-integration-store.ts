import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError } from "./http";
import { supabaseConfig } from "./supabase/config";
import {
  decryptGoogleSecret,
  encryptGoogleSecret,
} from "./google-token-crypto";
import {
  workspaceAnalysisSchema,
  workspaceMeetingSchema,
  type WorkspaceAnalysis,
  type WorkspaceMeeting,
} from "./workspace-types";
export function integrationAdmin() {
  const { url } = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    throw new ApiError(503, "Google integration storage is not configured.");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export async function storeGoogleConnection(
  userId: string,
  googleSub: string,
  googleEmail: string,
  refreshToken: string,
  scopes: string[],
) {
  const { error } = await integrationAdmin()
    .from("google_workspace_connections")
    .upsert({
      user_id: userId,
      google_sub: googleSub,
      google_email: googleEmail,
      refresh_token_ciphertext: encryptGoogleSecret(refreshToken, userId),
      scopes,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new ApiError(503, "Could not save the Google connection.");
}
export async function loadGoogleRefreshToken(userId: string): Promise<string> {
  const { data, error } = await integrationAdmin()
    .from("google_workspace_connections")
    .select("refresh_token_ciphertext")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ApiError(503, "Could not read the Google connection.");
  if (!data)
    throw new ApiError(
      409,
      "Connect Google Workspace at /api/google-workspace/connect first.",
    );
  return decryptGoogleSecret(
    z.string().parse(data.refresh_token_ciphertext),
    userId,
  );
}
const jobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  lease_token: z.string().uuid().nullable(),
  status: z.enum(["processing", "sending", "failed", "sent"]),
  source: workspaceMeetingSchema,
  analysis: workspaceAnalysisSchema.nullable(),
  meeting_id: z.string().uuid().nullable(),
  meeting_version: z.number().int().nullable(),
  email_started_at: z.string().nullable(),
  email_payload: z
    .object({
      from: z.string(),
      subject: z.string(),
      html: z.string(),
      text: z.string(),
    })
    .nullable(),
  email_ids: z.array(z.string()).nullable(),
});
export type MeetSyncJob = z.infer<typeof jobSchema>;
async function rpc(name: string, parameters: Record<string, unknown>) {
  const { data, error } = await integrationAdmin().rpc(name, parameters);
  if (error)
    throw new ApiError(
      /busy|expired|changed|duplicate|matches|retry|reconcile/i.test(
        error.message,
      )
        ? 409
        : 503,
      /busy|expired|changed|duplicate|matches|retry|reconcile/i.test(
        error.message,
      )
        ? error.message
        : "Google integration database operation failed.",
    );
  return data;
}
export async function claimMeetSync(
  userId: string,
  fingerprint: string,
  source: WorkspaceMeeting,
): Promise<MeetSyncJob> {
  return jobSchema.parse(
    await rpc("claim_meet_sync", {
      p_user_id: userId,
      p_fingerprint: fingerprint,
      p_source: source,
    }),
  );
}
export async function saveMeetSyncResult(
  userId: string,
  job: MeetSyncJob,
  analysis: WorkspaceAnalysis,
): Promise<MeetSyncJob> {
  return jobSchema.parse(
    await rpc("save_meet_sync_result", {
      p_user_id: userId,
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_analysis: analysis,
    }),
  );
}
export async function stageMeetEmail(
  userId: string,
  job: MeetSyncJob,
  payload: NonNullable<MeetSyncJob["email_payload"]>,
): Promise<MeetSyncJob> {
  return jobSchema.parse(
    await rpc("stage_meet_email", {
      p_user_id: userId,
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_payload: payload,
    }),
  );
}
export async function finishMeetSync(
  userId: string,
  job: MeetSyncJob,
  emailIds: string[],
) {
  await rpc("finish_meet_sync", {
    p_user_id: userId,
    p_job_id: job.id,
    p_lease_token: job.lease_token,
    p_email_ids: emailIds,
  });
}
export async function failMeetSync(userId: string, job: MeetSyncJob) {
  const { error } = await integrationAdmin()
    .from("google_meet_sync_jobs")
    .update({ status: "failed", lease_until: null, lease_token: null })
    .eq("id", job.id)
    .eq("user_id", userId)
    .eq("lease_token", job.lease_token);
  if (error) console.error("Could not release Google Meet sync lease.");
}
