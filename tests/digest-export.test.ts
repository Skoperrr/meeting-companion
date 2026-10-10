import test from "node:test";
import assert from "node:assert/strict";
import { emailDigest, slackDigest, taskCsv } from "../lib/digest-export.ts";
import type { Meeting, Task } from "../lib/schemas.ts";
const meeting: Meeting = {
  id: "m",
  version: 1,
  title: "<script>alert(1)</script>",
  meeting_date: "2026-10-11",
  transcript: "quote",
  review_state: "approved",
  analysis_source: "test",
  created_at: "",
  analysis: {
    summary: "Summary & context",
    decisions: ["Keep scope"],
    key_points: [],
    follow_ups: [],
    proposed_tasks: [],
  },
};
const task: Task = {
  id: "t",
  meeting_id: "m",
  meeting_title: meeting.title,
  proposal_index: 0,
  title: "=SUM(1,2)",
  description: 'Line 1\n"Line 2"',
  assigned_to: "Elena",
  assigned_email: null,
  due_date: "by Friday",
  priority: "High",
  status: "To Do",
  transcript_quote: "quote",
};
test("digest exports escape markup, retain task fields and neutralize spreadsheet formulas", () => {
  const html = emailDigest(meeting, [task]);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("<table"));
  assert.ok(slackDigest(meeting, [task]).includes("• Owner: Elena"));
  const csv = taskCsv([task]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('""Line 2""'));
  assert.ok(csv.includes("by Friday"));
});
