"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { statuses, type Task } from "@/lib/schemas";
import { moveKanbanTask, reconcileKanbanTasks } from "@/lib/kanban-state";
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
    Record<string, Task["status"] | null>
  >({});
  if (snapshot.source !== tasks && !pending) {
    setSnapshot({
      source: tasks,
      items: reconcileKanbanTasks(snapshot.items, tasks, optimistic),
    });
    setOptimistic((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id, status]) =>
          status === null
            ? tasks.some((task) => task.id === id)
            : !tasks.some((task) => task.id === id && task.status === status),
        ),
      ),
    );
  }
  const items = snapshot.items;
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
  async function mutate(
    task: Task,
    status?: Task["status"],
    nextItems?: Task[],
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    const before = snapshot.items;
    setOptimistic((current) => ({ ...current, [task.id]: status ?? null }));
    setSnapshot((current) => ({
      ...current,
      items: nextItems ?? current.items.filter((item) => item.id !== task.id),
    }));
    if (status === "Completed" && task.status !== "Completed") {
      playTaskSound("complete");
      void celebrateCompletion();
    }
    let saved = false;
    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(task.id)}`,
        {
          method: status ? "PATCH" : "DELETE",
          ...(status
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
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
    const status = statuses.find(
      (status) => status === result.destination?.droppableId,
    );
    if (!status) return;
    if (
      result.source.droppableId === status &&
      result.source.index === result.destination.index
    )
      return;
    if (status !== "Completed" || task.status === "Completed")
      playTaskSound("drop");
    const next = moveKanbanTask(
      items,
      task.id,
      status,
      result.destination.index,
    );
    if (task.status === status) {
      setSnapshot((current) => ({ ...current, items: next }));
      return;
    }
    void mutate(task, status, next);
  }
  return (
    <>
      <Toaster position="bottom-right" richColors />
      <section
        aria-label="Meeting task completion"
        className="mb-5 rounded-xl border border-slate-200 bg-white p-4"
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
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-[width] duration-500 ease-out motion-reduce:transition-none"
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
          <div className="board">
            {statuses.map((status, index) => {
              const column = items.filter((task) => task.status === status);
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
                                status,
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
