import { apiAuth } from "./auth";
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
  const [m, t] = await Promise.all([
    supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  check(m.error);
  check(t.error);
  const meetings = (m.data ?? []).map(meeting);
  const titles = new Map(meetings.map((m) => [m.id, m.title]));
  return {
    meetings,
    tasks: (t.data ?? []).map((row) => ({
      ...row,
      meeting_title: titles.get(row.meeting_id) ?? "Source meeting",
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
export async function saveMeeting(data: {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string;
  analysis: Analysis;
  analysis_source: string;
}) {
  const { supabase, user } = await apiAuth();
  const result = await supabase
    .from("meetings")
    .insert({ ...data, user_id: user.id, review_state: "pending" })
    .select("*")
    .single();
  check(result.error);
  if (!result.data) throw new Error("Meeting was not saved.");
  return meeting(result.data);
}
export async function approve(
  id: string,
  proposals: (Proposal & { proposal_index: number })[],
) {
  const { supabase } = await apiAuth();
  const { error } = await supabase.rpc("approve_meeting", {
    p_meeting_id: id,
    p_tasks: proposals,
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
