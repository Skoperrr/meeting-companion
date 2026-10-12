import type { Task } from "./schemas.ts";
export function moveKanbanTask(
  tasks: Task[],
  id: string,
  status: Task["status"],
  index: number,
): Task[] {
  const task = tasks.find((task) => task.id === id);
  if (!task) return tasks;
  const remaining = tasks.filter((task) => task.id !== id);
  const column = remaining.filter((task) => task.status === status);
  const target = Math.max(0, Math.min(index, column.length));
  const anchor = column[target];
  const at = anchor
    ? remaining.findIndex((task) => task.id === anchor.id)
    : column.length
      ? remaining.findIndex(
          (task) => task.id === column[column.length - 1].id,
        ) + 1
      : remaining.length;
  return [
    ...remaining.slice(0, at),
    { ...task, status },
    ...remaining.slice(at),
  ];
}
export function reconcileKanbanTasks(
  current: Task[],
  incoming: Task[],
  overrides: Record<string, Task["status"] | null> = {},
): Task[] {
  const byId = new Map(
    incoming
      .filter((task) => overrides[task.id] !== null)
      .map((task) => [
        task.id,
        overrides[task.id] ? { ...task, status: overrides[task.id]! } : task,
      ]),
  );
  const retained = current.flatMap((task) => {
    const fresh = byId.get(task.id);
    if (!fresh) return [];
    byId.delete(task.id);
    return [fresh];
  });
  return [...retained, ...byId.values()];
}
export type BoardPatch = Partial<
  Pick<Task, "status" | "assigned_to" | "assigned_email" | "due_date">
>;
export function moveGroupedTask(
  tasks: Task[],
  id: string,
  key: "status" | "assigned_to",
  value: string,
  index: number,
): Task[] {
  const task = tasks.find((t) => t.id === id);
  if (!task) return tasks;
  const remaining = tasks.filter((t) => t.id !== id);
  const column = remaining.filter(
    (t) =>
      t[key] === value ||
      (key === "status" && value === "In Progress" && t.status === "In Review"),
  );
  const target = Math.max(0, Math.min(index, column.length));
  const anchor = column[target];
  const at = anchor
    ? remaining.findIndex((t) => t.id === anchor.id)
    : column.length
      ? remaining.findIndex((t) => t.id === column[column.length - 1].id) + 1
      : remaining.length;
  const moved =
    key === "status"
      ? { ...task, status: value as Task["status"] }
      : {
          ...task,
          assigned_to: value,
          assigned_email:
            task.assigned_to === value ? task.assigned_email : null,
        };
  return [...remaining.slice(0, at), moved, ...remaining.slice(at)];
}
export function reconcileBoardTasks(
  current: Task[],
  incoming: Task[],
  overrides: Record<string, BoardPatch | null>,
): Task[] {
  const byId = new Map(
    incoming
      .filter((t) => overrides[t.id] !== null)
      .map((t) => [t.id, { ...t, ...overrides[t.id] }]),
  );
  const retained = current.flatMap((t) => {
    const fresh = byId.get(t.id);
    if (!fresh) return [];
    byId.delete(t.id);
    return [fresh];
  });
  return [...retained, ...byId.values()];
}
