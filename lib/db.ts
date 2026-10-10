import { apiAuth } from "./auth";
import type { DuplicateMatch } from "./schemas";
import { ApiError } from "./http";
import {
  analysisSchema,
  type Analysis,
  type Meeting,
  type Task,
  type Proposal,
} from "./schemas";
function meeting(row: Record<string, unknown>): Meeting {
  return { ...row, analysis: analysisSchema.parse(row.analysis) } as Meeting;
}
function check(error: { code?: string; message: string } | null) {
  if (error) {
    if (
      error.code === "P0001" &&
      /duplicate|changed|request|conflict/i.test(error.message)
    )
      throw new ApiError(409, error.message);
    if (error.code === "23505")
      throw new ApiError(
        409,
        "Request already saved. Refresh to view the meeting.",
      );
    throw new Error("Database request failed.");
  }
}
export async function listData() {
  const { supabase, user } = await apiAuth();
  const [m, t, revisions] = await Promise.all([
    supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("meeting_revisions")
      .select("meeting_id,version,title,meeting_date")
      .eq("user_id", user.id),
  ]);
  check(revisions.error);
  check(m.error);
  check(t.error);
  const meetings = (m.data ?? []).map(meeting);
  const sources = new Map(
    (revisions.data ?? []).map((revision) => [
      `${revision.meeting_id}:${revision.version}`,
      revision,
    ]),
  );
  return {
    meetings,
    tasks: (t.data ?? []).map((row) => ({
      ...row,
      meeting_title:
        sources.get(`${row.meeting_id}:${row.meeting_version}`)?.title ??
        "Source meeting",
      meeting_date: sources.get(`${row.meeting_id}:${row.meeting_version}`)
        ?.meeting_date,
    })) as Task[],
  };
}
export async function getMeeting(id: string): Promise<Meeting | null> {
  const { supabase, user } = await apiAuth();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  check(error);
  return data ? meeting(data) : null;
}
export async function approve(
  id: string,
  proposals: (Proposal & { proposal_index: number })[],
  version: number,
) {
  const { supabase } = await apiAuth();
  const { error } = await supabase.rpc("approve_meeting", {
    p_meeting_id: id,
    p_tasks: proposals,
    p_expected_version: version,
  });
  check(error);
}
export async function updateTask(
  id: string,
  patch: Partial<Proposal> & { status?: Task["status"] },
) {
  const { supabase, user } = await apiAuth();
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  check(error);
  if (!data) throw new ApiError(404, "Task not found.");
  return data;
}
export async function deleteTask(id: string) {
  const { supabase, user } = await apiAuth();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  check(error);
  if (!data?.length) throw new ApiError(404, "Task not found.");
}

export async function findDuplicate(
  title: string,
  transcript: string,
): Promise<DuplicateMatch | null> {
  const { supabase } = await apiAuth();
  const { data, error } = await supabase.rpc("check_meeting_duplicate", {
    p_title: title,
    p_transcript: transcript,
  });
  check(error);
  return (data?.[0] as DuplicateMatch | undefined) ?? null;
}
export async function getRequestMeeting(
  requestId: string,
): Promise<Meeting | null> {
  const { supabase, user } = await apiAuth();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("user_id", user.id)
    .eq("last_request_id", requestId)
    .maybeSingle();
  check(error);
  return data ? meeting(data) : null;
}
export async function saveProcessedMeeting(input: {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string;
  analysis: Analysis;
  analysis_source: string;
  upsert: boolean;
  meeting_id?: string;
  expected_version?: number;
}) {
  const { supabase } = await apiAuth();
  const { data, error } = await supabase.rpc("save_processed_meeting", {
    p_request_id: input.id,
    p_title: input.title,
    p_date: input.meeting_date,
    p_transcript: input.transcript,
    p_analysis: input.analysis,
    p_source: input.analysis_source,
    p_upsert: input.upsert,
    p_meeting_id: input.meeting_id ?? null,
    p_expected_version: input.expected_version ?? null,
  });
  check(error);
  if (!data) throw new Error("Meeting was not saved.");
  return meeting(data);
}
