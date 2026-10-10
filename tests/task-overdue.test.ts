import test from "node:test";
import assert from "node:assert/strict";
import { isTaskOverdue } from "../lib/task-overdue.ts";
const now = new Date(2026, 9, 10, 12);
const task = {
  due_date: "2026-10-09",
  status: "To Do" as const,
  meeting_date: "2026-10-05",
};
test("past deadlines are overdue but today, future and completed tasks are not", () => {
  assert.equal(isTaskOverdue(task, now), true);
  assert.equal(isTaskOverdue({ ...task, due_date: "2026-10-10" }, now), false);
  assert.equal(isTaskOverdue({ ...task, due_date: "2026-10-11" }, now), false);
  assert.equal(isTaskOverdue({ ...task, status: "Completed" }, now), false);
});
test("relative deadlines stay anchored to the source meeting", () => {
  assert.equal(isTaskOverdue({ ...task, due_date: "by Friday" }, now), true);
  assert.equal(isTaskOverdue({ ...task, due_date: "tomorrow" }, now), true);
  assert.equal(isTaskOverdue({ ...task, due_date: "next week" }, now), false);
  assert.equal(
    isTaskOverdue(
      { ...task, due_date: "by Friday", meeting_date: undefined },
      now,
    ),
    false,
  );
});
test("unknown, unspecified and invalid dates never manufacture overdue warnings", () => {
  for (const due_date of [
    "Not specified",
    "Unassigned",
    "",
    "soon",
    "2026-02-30",
    "when ready",
  ])
    assert.equal(isTaskOverdue({ ...task, due_date }, now), false);
});
