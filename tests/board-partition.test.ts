import test from "node:test";
import assert from "node:assert/strict";
import { partitionBoardColumns } from "../lib/board-partition.ts";
import { moveGroupedTask } from "../lib/kanban-state.ts";
import type { Task } from "../lib/schemas.ts";
function task(
  id: string,
  status: Task["status"],
  assigned_to = "Unassigned",
): Task {
  return {
    id,
    status,
    assigned_to,
    title: id,
    description: "Task",
    due_date: "Not specified",
    priority: "Med",
    transcript_quote: "Evidence",
    meeting_id: "meeting",
    meeting_title: "Meeting",
    proposal_index: 0,
  };
}
test("status partition preserves task references and order, including In Review", () => {
  const input = [
    task("a", "In Progress"),
    task("b", "In Review"),
    task("c", "Completed"),
    task("d", "In Progress"),
  ];
  const result = partitionBoardColumns(input, input, "status");
  assert.deepEqual(result.columns, [
    "To Do",
    "In Progress",
    "Blocked",
    "Completed",
  ]);
  assert.deepEqual(
    result.buckets.get("In Progress")?.map((t) => t.id),
    ["a", "b", "d"],
  );
  assert.equal(result.buckets.get("In Progress")?.[1], input[1]);
  assert.equal(input[1].status, "In Review");
  assert.equal(result.completed, 1);
  assert.equal(result.byId.get("d"), input[3]);
  assert.equal([...result.buckets.values()].flat().length, input.length);
});
test("assignee lanes retain pending source owners and always include Unassigned", () => {
  const source = [task("a", "To Do", "Elena")],
    input = [{ ...source[0], assigned_to: "Lerato" }];
  const result = partitionBoardColumns(input, source, "assigned_to");
  assert.deepEqual(result.columns, ["Elena", "Lerato", "Unassigned"]);
  assert.equal(result.buckets.get("Elena")?.length, 0);
  assert.equal(result.buckets.get("Lerato")?.[0], input[0]);
});
test("a high-volume partition contains each task exactly once without cloning", () => {
  const input = Array.from({ length: 10000 }, (_, i) =>
    task(String(i), i % 2 ? "In Review" : "To Do"),
  );
  const result = partitionBoardColumns(input, input, "status");
  assert.equal(result.byId.size, 10000);
  assert.equal(result.buckets.get("In Progress")?.length, 5000);
  assert.equal(result.buckets.get("To Do")?.[4999], input[9998]);
});
test("drop indexes match the merged In Progress lane", () => {
  const input = [
    task("a", "In Progress"),
    task("b", "In Review"),
    task("c", "In Progress"),
    task("d", "To Do"),
  ];
  const result = moveGroupedTask(input, "d", "status", "In Progress", 1);
  assert.deepEqual(
    result
      .filter((t) => t.status === "In Progress" || t.status === "In Review")
      .map((t) => t.id),
    ["a", "d", "b", "c"],
  );
  assert.equal(input[3].status, "To Do");
});
