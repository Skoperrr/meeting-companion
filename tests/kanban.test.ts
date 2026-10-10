import test from "node:test";
import assert from "node:assert/strict";
import {
  moveKanbanTask,
  reconcileKanbanTasks,
  moveGroupedTask,
  reconcileBoardTasks,
} from "../lib/kanban-state.ts";
import type { Task } from "../lib/schemas.ts";
const card = (id: string, status: Task["status"]): Task => ({
  id,
  status,
  title: id,
  description: "",
  assigned_to: "Unassigned",
  due_date: "Not specified",
  priority: "Med",
  transcript_quote: "Quote",
  meeting_id: "meeting",
  meeting_title: "Meeting",
  proposal_index: 0,
  meeting_version: 1,
});
const tasks = [card("a", "To Do"), card("b", "To Do"), card("c", "Completed")];
test("cross-column drops change exactly one task and maintain destination order", () => {
  const next = moveKanbanTask(tasks, "a", "Completed", 0);
  assert.deepEqual(
    next.filter((t) => t.status === "Completed").map((t) => t.id),
    ["a", "c"],
  );
  assert.equal(tasks[0].status, "To Do");
  assert.equal(next.length, 3);
});
test("same-column reorders preserve status and contain each task once", () => {
  const next = moveKanbanTask(tasks, "b", "To Do", 0);
  assert.deepEqual(
    next.filter((t) => t.status === "To Do").map((t) => t.id),
    ["b", "a"],
  );
  assert.equal(new Set(next.map((t) => t.id)).size, 3);
});
test("refresh preserves local order while accepting server fields and additions", () => {
  const current = moveKanbanTask(tasks, "b", "To Do", 0);
  const next = reconcileKanbanTasks(current, [
    { ...tasks[0], title: "Updated" },
    tasks[1],
    card("d", "Blocked"),
  ]);
  assert.deepEqual(
    next.map((t) => t.id),
    ["b", "a", "d"],
  );
  assert.equal(next.find((t) => t.id === "a")?.title, "Updated");
});
test("stale snapshots cannot undo unacknowledged status moves or deletions", () => {
  const next = reconcileKanbanTasks(tasks, tasks, { a: "Completed", b: null });
  assert.equal(next.find((t) => t.id === "a")?.status, "Completed");
  assert.equal(
    next.some((t) => t.id === "b"),
    false,
  );
  assert.equal(
    reconcileKanbanTasks(next, tasks).find((t) => t.id === "a")?.status,
    "To Do",
  );
});

test("assignee swimlane drops persist one owner change without changing status or retaining an old email", () => {
  const original = [
    { ...tasks[0], assigned_to: "Elena", assigned_email: "elena@example.com" },
    { ...tasks[1], assigned_to: "Marcus" },
  ];
  const next = moveGroupedTask(original, "a", "assigned_to", "Marcus", 0);
  assert.deepEqual(
    next.map((t) => t.id),
    ["a", "b"],
  );
  assert.equal(next[0].assigned_to, "Marcus");
  assert.equal(next[0].status, "To Do");
  assert.equal(next[0].assigned_email, null);
  assert.equal(original[0].assigned_to, "Elena");
  const reconciled = reconcileBoardTasks(next, original, {
    a: { assigned_to: "Marcus", assigned_email: null },
  });
  assert.equal(reconciled[0].assigned_to, "Marcus");
  assert.equal(reconciled[0].assigned_email, null);
});
