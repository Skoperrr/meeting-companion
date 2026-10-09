import type { Analysis, Meeting, Task, Proposal } from "./schemas";
import { ApiError } from "./http";
// The same application runs with Supabase PostgREST or the hosted SQLite/D1 adapter.
const useSupabase = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
async function rest<T = Record<string, unknown>[]>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("Database request failed.");
  return (r.status === 204 ? null : await r.json()) as T;
}
async function d1() {
  const { env } = await import("@/lib/platform");
  if (!env.DB) throw new Error("Database unavailable.");
  return env.DB;
}
function parseMeeting(row: Record<string, unknown>): Meeting {
  return {
    ...row,
    analysis:
      typeof row.analysis === "string"
        ? JSON.parse(row.analysis)
        : row.analysis,
  } as Meeting;
}
export async function listData() {
  if (useSupabase()) {
    const [m, t] = await Promise.all([
      rest("meetings?order=created_at.desc"),
      rest<(Task & { meetings: { title: string } })[]>(
        "tasks?select=*,meetings(title)&order=created_at.desc",
      ),
    ]);
    return {
      meetings: m.map(parseMeeting),
      tasks: t.map((r: Task & { meetings: { title: string } }) => ({
        ...r,
        meeting_title: r.meetings.title,
      })),
    };
  }
  const db = await d1();
  const [m, t] = await Promise.all([
    db.prepare("SELECT * FROM meetings ORDER BY created_at DESC").all(),
    db
      .prepare(
        "SELECT tasks.*, meetings.title AS meeting_title FROM tasks JOIN meetings ON meetings.id=tasks.meeting_id ORDER BY tasks.created_at DESC",
      )
      .all(),
  ]);
  return { meetings: m.results.map(parseMeeting), tasks: t.results as Task[] };
}
export async function getMeeting(id: string): Promise<Meeting | null> {
  if (useSupabase()) {
    const rows = await rest(`meetings?id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? parseMeeting(rows[0]) : null;
  }
  const row = await (
    await d1()
  )
    .prepare("SELECT * FROM meetings WHERE id=?")
    .bind(id)
    .first<Record<string, unknown>>();
  return row ? parseMeeting(row) : null;
}
export async function saveMeeting(data: {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string;
  analysis: Analysis;
  analysis_source: string;
}) {
  const row = {
    ...data,
    review_state: "pending",
    created_at: new Date().toISOString(),
  };
  if (useSupabase())
    await rest("meetings?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
  else
    await (
      await d1()
    )
      .prepare(
        "INSERT OR IGNORE INTO meetings (id,title,meeting_date,transcript,analysis,review_state,analysis_source,created_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(
        row.id,
        row.title,
        row.meeting_date,
        row.transcript,
        JSON.stringify(row.analysis),
        row.review_state,
        row.analysis_source,
        row.created_at,
      )
      .run();
  return (await getMeeting(data.id))!;
}
export async function approve(
  id: string,
  proposals: (Proposal & { proposal_index: number })[],
) {
  if (useSupabase()) {
    await rest("rpc/approve_meeting", {
      method: "POST",
      body: JSON.stringify({ p_meeting_id: id, p_tasks: proposals }),
    });
    return;
  }
  const db = await d1();
  const now = new Date().toISOString();
  const writes = proposals.map((t) =>
    db
      .prepare(
        `INSERT INTO tasks (id,meeting_id,proposal_index,title,description,assigned_to,due_date,priority,status,transcript_quote,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,'To Do',?,?,? WHERE EXISTS (SELECT 1 FROM meetings WHERE id=? AND review_state='pending')`,
      )
      .bind(
        `${id}:${t.proposal_index}`,
        id,
        t.proposal_index,
        t.title,
        t.description,
        t.assigned_to,
        t.due_date,
        t.priority,
        t.transcript_quote,
        now,
        now,
        id,
      ),
  );
  writes.push(
    db
      .prepare(
        "UPDATE meetings SET review_state='approved' WHERE id=? AND review_state='pending'",
      )
      .bind(id),
  );
  await db.batch(writes);
}
export async function updateTask(
  id: string,
  patch: Partial<Proposal> & { status?: Task["status"] },
) {
  if (useSupabase()) {
    const rows = await rest(`tasks?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
    if (!rows.length) throw new ApiError(404, "Task not found.");
    return rows[0];
  }
  const keys = Object.keys(patch);
  const values = Object.values(patch);
  const db = await d1();
  const row = await db
    .prepare(
      `UPDATE tasks SET ${keys.map((k) => `${k}=?`).join(",")}, updated_at=? WHERE id=? RETURNING *`,
    )
    .bind(...values, new Date().toISOString(), id)
    .first();
  if (!row) throw new ApiError(404, "Task not found.");
  return row;
}
export async function deleteTask(id: string) {
  if (useSupabase()) {
    await rest(`tasks?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  await (await d1()).prepare("DELETE FROM tasks WHERE id=?").bind(id).run();
}
