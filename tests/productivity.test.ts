import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filterTasks, meetingMarkdown } from "../lib/productivity.ts";
import { safeNext } from "../lib/supabase/config.ts";
import type { Meeting, Task } from "../lib/schemas.ts";
const analysis = JSON.parse(
  readFileSync(new URL("../test-data/expected.json", import.meta.url), "utf8"),
);
const meeting: Meeting = {
  version: 1,
  id: "meeting-a",
  title: "Sprint *review*",
  meeting_date: "2026-10-09",
  transcript: "Transcript",
  analysis,
  review_state: "approved",
  analysis_source: "Fixture",
  created_at: "2026-10-09T00:00:00Z",
};
const tasks: Task[] = analysis.proposed_tasks.map((p: Task, i: number) => ({
  ...p,
  id: `task-${i}`,
  meeting_id: i === 2 ? "other-meeting" : meeting.id,
  meeting_title: meeting.title,
  proposal_index: i,
  status: i === 1 ? "Completed" : "To Do",
}));
test("combined filters match all selected fields and retain Unassigned", () => {
  const task = tasks[0];
  assert.deepEqual(
    filterTasks(tasks, {
      assignee: task.assigned_to,
      priority: task.priority,
      status: task.status,
    }),
    [task],
  );
  assert.deepEqual(
    filterTasks(tasks, {
      assignee: task.assigned_to,
      priority: task.priority,
      status: "Blocked",
    }),
    [],
  );
  assert.equal(
    filterTasks(tasks, { assignee: "Unassigned", priority: "", status: "" })
      .length,
    1,
  );
  assert.deepEqual(
    filterTasks(tasks, { assignee: "", priority: "", status: "" }),
    tasks,
  );
});
test("Markdown scopes tasks to source meeting and preserves completed state and evidence", () => {
  const markdown = meetingMarkdown(meeting, tasks);
  assert.ok(markdown.includes("# Sprint \\*review\\*"));
  assert.ok(markdown.includes("## Decisions"));
  assert.ok(markdown.includes(`- [x] ${tasks[1].title}`));
  assert.ok(markdown.includes(tasks[0].transcript_quote));
  assert.ok(!markdown.includes(tasks[2].title));
});
test("OAuth redirects reject external origins and unrecognized paths", () => {
  for (const target of [
    "https://evil.example",
    "//evil.example",
    "/auth/callback",
    "/dashboard?next=https://evil.example",
    null,
  ])
    assert.equal(safeNext(target), "/dashboard");
  assert.equal(safeNext("/tracker"), "/tracker");
});
