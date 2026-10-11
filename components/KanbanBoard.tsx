"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { statuses, type Task } from "@/lib/schemas";
import {
  moveKanbanTask,
  moveGroupedTask,
  reconcileBoardTasks,
  type BoardPatch,
} from "@/lib/kanban-state";
import { playTaskSound } from "@/lib/audio";
import { celebrateCompletion } from "@/lib/confetti";
import KanbanCard from "./KanbanCard";
import TaskCardSkeleton from "./TaskCardSkeleton";
const subscribe = () => () => {};
export default function KanbanBoard({
  tasks,
  onUpdated,
  onMeeting,
  onAssignee,
}: {
  tasks: Task[];
  onUpdated: () => Promise<void>;
  onMeeting: (id: string) => void;
  onAssignee: (name: string) => void;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [snapshot, setSnapshot] = useState({ source: tasks, items: tasks });
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [optimistic, setOptimistic] = useState<
    Record<string, BoardPatch | null>
  >({});
  if (snapshot.source !== tasks && !pending) {
    setSnapshot({
      source: tasks,
      items: reconcileBoardTasks(snapshot.items, tasks, optimistic),
    });
    setOptimistic((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id, status]) =>
          status === null
            ? tasks.some((task) => task.id === id)
            : !tasks.some(
                (task) =>
                  task.id === id &&
                  Object.entries(status).every(
                    ([key, value]) => task[key as keyof Task] === value,
                  ),
              ),
        ),
      ),
    );
  }
  const [grouping, setGrouping] = useState<"status" | "assigned_to">("status");
  const items = snapshot.items;
  const columns: string[] =
    grouping === "status"
      ? [...statuses]
      : [
          ...new Set([
            ...items.map((t) => t.assigned_to),
            ...tasks.map((t) => t.assigned_to),
            "Unassigned",
          ]),
        ].sort((a, b) =>
          a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
        );
  const completed = items.filter((task) => task.status === "Completed").length;
  const percent = items.length
    ? Math.round((completed / items.length) * 100)
    : 0;
  async function refresh() {
    router.refresh();
    try {
      await onUpdated();
    } catch {
      toast.warning("Changes saved. Reload to refresh dashboard metrics.");
    }
  }
  async function mutate(task: Task, patch?: BoardPatch, nextItems?: Task[]) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    const before = snapshot.items;
    setOptimistic((current) => ({ ...current, [task.id]: patch ?? null }));
    setSnapshot((current) => ({
      ...current,
      items: nextItems ?? current.items.filter((item) => item.id !== task.id),
    }));
    if (patch?.status === "Completed" && task.status !== "Completed") {
      playTaskSound("complete");
      void celebrateCompletion();
    }
    let saved = false;
    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(task.id)}`,
        {
          method: patch ? "PATCH" : "DELETE",
          ...(patch
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...(patch.status !== undefined
                    ? { status: patch.status }
                    : {}),
                  ...(patch.assigned_to !== undefined
                    ? { assigned_to: patch.assigned_to }
                    : {}),
                }),
              }
            : {}),
        },
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw new Error(
          body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
            ? body.error
            : "Could not save this change. The card has been restored.",
        );
      }
      saved = true;
    } catch (error) {
      setOptimistic((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => id !== task.id),
        ),
      );
      setSnapshot((current) => ({ ...current, items: before }));
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save this change. The card has been restored.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
    if (saved) await refresh();
  }
  function drop(result: DropResult) {
    if (lock.current || !result.destination || result.reason === "CANCEL")
      return;
    const task = items.find((task) => task.id === result.draggableId);
    if (!task) return;
    const value = result.destination.droppableId;
    if (!columns.includes(value)) return;
    if (
      result.source.droppableId === value &&
      result.source.index === result.destination.index
    )
      return;
    if (
      grouping !== "status" ||
      value !== "Completed" ||
      task.status === "Completed"
    )
      playTaskSound("drop");
    const next = moveGroupedTask(
      items,
      task.id,
      grouping,
      value,
      result.destination.index,
    );
    if (task[grouping] === value) {
      setSnapshot((current) => ({ ...current, items: next }));
      return;
    }
    const patch: BoardPatch =
      grouping === "status"
        ? { status: value as Task["status"] }
        : { assigned_to: value, assigned_email: null };
    void mutate(task, patch, next);
  }

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{ className: "botanical-toast" }}
      />
      <div
        role="group"
        aria-label="Board grouping"
        className="mb-4 inline-flex rounded-xl border border-botanical-border bg-botanical-linen p-1 text-sm"
      >
        {(
          [
            ["status", "Group by Status"],
            ["assigned_to", "Group by Assignee"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={grouping === key}
            disabled={pending}
            onClick={() => setGrouping(key)}
            className={`rounded-lg px-4 py-2 transition-colors disabled:opacity-50 ${grouping === key ? "bg-botanical-forest text-botanical-paper shadow-sm" : "text-botanical-muted hover:bg-botanical-border hover:text-botanical-forest"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        aria-label="Meeting task completion"
        className="mb-5 rounded-xl border border-slate-200 bg-botanical-paper p-5"
      >
        <div className="mb-3 flex justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-700">
            {completed} of {items.length} Tasks Completed ({percent}%)
          </span>
          {pending && (
            <span role="status" className="text-xs text-indigo-600">
              Saving...
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Completed tasks"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            style={{ width: `${percent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-botanical-sage to-botanical-moss transition-[width] duration-500 ease-out motion-reduce:transition-none"
          />
        </div>
      </section>
      {!mounted ? (
        <div className="board" aria-busy="true">
          <span className="sr-only" role="status">
            Loading interactive board...
          </span>
          {statuses.map((status) => (
            <section className="board-column" key={status}>
              <h3 className="mb-4 text-sm font-semibold">{status}</h3>
              <TaskCardSkeleton />
            </section>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={drop}>
          <div
            className="board"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))`,
            }}
          >
            {columns.map((status, index) => {
              const column = items.filter((task) => task[grouping] === status);
              return (
                <section key={status} className="board-column">
                  <div className="column-heading">
                    <span className={`status-marker marker-${index}`} />
                    <h3>{status}</h3>
                    <span>{column.length}</span>
                  </div>
                  <Droppable droppableId={status} isDropDisabled={pending}>
                    {(provided, state) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`column-cards min-h-40 rounded-xl p-1 transition-colors duration-200 ${state.isDraggingOver ? "bg-indigo-100/50 ring-2 ring-indigo-300/50" : ""}`}
                      >
                        {column.map((task, index) => (
                          <KanbanCard
                            key={task.id}
                            task={task}
                            index={index}
                            disabled={pending}
                            onStatusChange={(status) =>
                              mutate(
                                task,
                                { status },
                                moveKanbanTask(
                                  items,
                                  task.id,
                                  status,
                                  items.filter((item) => item.status === status)
                                    .length,
                                ),
                              )
                            }
                            onDelete={() => mutate(task)}
                            onMeeting={onMeeting}
                            onAssignee={onAssignee}
                          />
                        ))}
                        {provided.placeholder}
                        {!column.length && (
                          <div
                            className={`rounded-xl border border-dotted px-4 py-8 text-center text-xs ${state.isDraggingOver ? "border-indigo-400 bg-indigo-200/30 text-indigo-600" : "border-slate-300 text-slate-400"}`}
                          >
                            {state.isDraggingOver
                              ? "Drop task here"
                              : "No tasks here"}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </>
  );
}
