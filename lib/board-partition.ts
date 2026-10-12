import type { Task } from "./schemas.ts";
export type BoardGrouping = "status" | "assigned_to";
export const STATUS_COLUMNS = [
  "To Do",
  "In Progress",
  "Blocked",
  "In Review",
  "Completed",
] as const;
/** Single pass over the visible tasks; each status has its own lane. */
export function partitionBoardColumns(
  items: Task[],
  source: Task[],
  grouping: BoardGrouping,
) {
  const buckets = new Map<string, Task[]>();
  const byId = new Map<string, Task>();
  let completed = 0;
  if (grouping === "status")
    for (const status of STATUS_COLUMNS) buckets.set(status, []);
  else {
    for (const task of source) buckets.set(task.assigned_to, []);
    buckets.set("Unassigned", []);
  }
  for (const task of items) {
    byId.set(task.id, task);
    if (task.status === "Completed") completed++;
    const key = grouping === "status" ? task.status : task.assigned_to;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(task);
    else buckets.set(key, [task]);
  }
  const columns =
    grouping === "status"
      ? [...STATUS_COLUMNS]
      : [...buckets.keys()].sort((a, b) =>
          a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
        );
  return { columns, buckets, byId, completed };
}
