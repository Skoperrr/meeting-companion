"use client";
import { springPhysics } from "@/lib/motion";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import VirtualTaskList from "./VirtualTaskList";
import TaskCard from "./TaskCard";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import CommitmentCard, { type CardActions } from "./CommitmentCard";
import { partitionBoardColumns } from "@/lib/board-partition";
import TaskCardSkeleton from "./TaskCardSkeleton";
const subscribe = () => () => {};
export default function CommitmentBoard({
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
  const read = useCallback(() => snapshot.items, [snapshot.items]);
  const write = useCallback(
    (items: Task[]) => setSnapshot((current) => ({ ...current, items })),
    [],
  );
  const mutation = useOptimisticMutation(read, write);
  const pending = mutation.pending;
  const [mutationId, setMutationId] = useState<string | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [animationIds, setAnimationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const layoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
    },
    [],
  );
  const [ghosts, setGhosts] = useState<
    {
      key: string;
      task: Task;
      top: number;
      left: number;
      width: number;
      height: number;
    }[]
  >([]);
  const [dragging, setDragging] = useState(false);
  const reduced = useReducedMotion();
  const [listMode, setListMode] = useState(false);
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
  const partition = useMemo(
    () => partitionBoardColumns(items, tasks, grouping),
    [items, tasks, grouping],
  );
  const { columns, completed } = partition;
  function scheduleLayout(next: Task[]) {
    if (reduced) return;
    const after = partitionBoardColumns(next, tasks, grouping);
    const beforePositions = new Map<string, string>();
    for (const [column, bucket] of partition.buckets)
      bucket.forEach((task, index) =>
        beforePositions.set(task.id, `${column}:${index}`),
      );
    const affected = new Set<string>();
    for (const [column, bucket] of after.buckets)
      bucket.forEach((task, index) => {
        if (beforePositions.get(task.id) !== `${column}:${index}`)
          affected.add(task.id);
      });
    setAnimationIds(affected);
    setLayoutReady(true);
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    layoutTimer.current = setTimeout(() => {
      setAnimationIds(new Set());
      setLayoutReady(false);
    }, 800);
  }
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
    patch?: BoardPatch,
    nextItems?: Task[],
    throwOnFailure = false,
  ) {
    if (lock.current) return;
    lock.current = true;
    setMutationId(task.id);
    scheduleLayout(nextItems ?? items.filter((item) => item.id !== task.id));
    if (
      !reduced &&
      (!patch || (patch.status && patch.status !== task.status))
    ) {
      const rect = document
        .querySelector(`[data-task-id="${task.id}"]`)
        ?.getBoundingClientRect();
      if (rect)
        setGhosts((current) => [
          ...current,
          {
            key: crypto.randomUUID(),
            task,
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        ]);
    }
    setOptimistic((current) => ({ ...current, [task.id]: patch ?? null }));
    if (patch?.status === "Completed" && task.status !== "Completed") {
      playTaskSound("complete");
      void celebrateCompletion();
    }
    const saved = await mutation.mutate(
      () => nextItems ?? snapshot.items.filter((item) => item.id !== task.id),
      async () => {
        const response = await fetch(
          `/api/tasks/${encodeURIComponent(task.id)}`,
          {
            method: patch ? "PATCH" : "DELETE",
            ...(patch
              ? {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...patch, assigned_email: undefined }),
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
              : "Could not save this change. Restored the previous state.",
          );
        }
      },
    );
    lock.current = false;
    setMutationId(null);
    if (!saved)
      setOptimistic((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => id !== task.id),
        ),
      );
    if (saved) await refresh();
    else if (throwOnFailure)
      throw new Error("Deadline was not saved. Try again.");
  }

  // Stable event props read only the last committed board snapshot.
  const live = useRef({ items, mutate, onMeeting, onAssignee });
  useLayoutEffect(() => {
    live.current = { items, mutate, onMeeting, onAssignee };
  });
  const actions = useMemo<CardActions>(
    () => ({
      due: async (id, due_date) => {
        const current = live.current,
          task = current.items.find((item) => item.id === id);
        if (task)
          await current.mutate(
            task,
            { due_date },
            current.items.map((item) =>
              item.id === id ? { ...item, due_date } : item,
            ),
            true,
          );
      },
      status: async (id, status) => {
        const current = live.current,
          task = current.items.find((item) => item.id === id);
        if (task && task.status !== status)
          await current.mutate(
            task,
            { status },
            moveKanbanTask(
              current.items,
              id,
              status,
              current.items.filter((item) => item.status === status).length,
            ),
          );
      },
      remove: async (id) => {
        const current = live.current,
          task = current.items.find((item) => item.id === id);
        if (task) await current.mutate(task);
      },
      meeting: (id) => live.current.onMeeting(id),
      assignee: (name) => live.current.onAssignee(name),
    }),
    [],
  );
  function drop(result: DropResult) {
    setDragging(false);
    if (lock.current || !result.destination || result.reason === "CANCEL")
      return;
    const task = partition.byId.get(result.draggableId);
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
    let next = moveGroupedTask(
      items,
      task.id,
      grouping,
      value,
      result.destination.index,
    );
    if (result.source.droppableId === value) {
      if (grouping === "status")
        next = next.map((item) =>
          item.id === task.id ? { ...item, status: task.status } : item,
        );
      scheduleLayout(next);
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
      <AnimatePresence>
        {ghosts.map((ghost) => (
          <motion.div
            key={ghost.key}
            aria-hidden="true"
            inert
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onAnimationComplete={() =>
              setGhosts((current) =>
                current.filter((item) => item.key !== ghost.key),
              )
            }
            style={{
              position: "fixed",
              top: ghost.top,
              left: ghost.left,
              width: ghost.width,
              height: ghost.height,
              pointerEvents: "none",
              zIndex: 60,
            }}
          >
            <article
              className="task-card performance-task-card"
              style={{ height: "100%", overflow: "hidden" }}
            >
              <h4>{ghost.task.title}</h4>
              <p>{ghost.task.description}</p>
              <span className="text-xs text-text-secondary">
                {ghost.task.assigned_to}
              </span>
            </article>
          </motion.div>
        ))}
      </AnimatePresence>
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
            onClick={() => {
              scheduleLayout(items);
              setGrouping(key);
            }}
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
      <button
        type="button"
        onClick={() => setListMode((current) => !current)}
        aria-pressed={listMode}
        className="mb-4 inline-flex items-center justify-center rounded-lg border border-botanical-border bg-botanical-linen px-4 py-2 !text-sm !leading-5 text-botanical-muted transition-colors hover:bg-botanical-border hover:text-botanical-forest"
      >
        {listMode ? "View Kanban board" : "View compact task list"}
      </button>
      {listMode ? (
        <VirtualTaskList
          items={items}
          getKey={(task) => task.id}
          label="Task list"
          estimate={320}
          renderItem={(task) => (
            <TaskCard
              task={task}
              saving={pending}
              onStatusChange={(status) =>
                mutate(
                  task,
                  { status },
                  items.map((item) =>
                    item.id === task.id ? { ...item, status } : item,
                  ),
                )
              }
              onDueChange={(due_date) =>
                mutate(
                  task,
                  { due_date },
                  items.map((item) =>
                    item.id === task.id ? { ...item, due_date } : item,
                  ),
                  true,
                )
              }
              onDelete={() => mutate(task)}
              onMeeting={onMeeting}
              onEvidence={() => onMeeting(task.meeting_id)}
            />
          )}
        />
      ) : !mounted ? (
        <div className="board" aria-busy="true">
          <span className="sr-only" role="status">
            Loading interactive board...
          </span>
          {statuses
            .filter((status) => status !== "In Review")
            .map((status) => (
              <section className="board-column" key={status}>
                <h3 className="mb-4 text-sm font-semibold">{status}</h3>
                <TaskCardSkeleton />
              </section>
            ))}
        </div>
      ) : (
        <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={drop}>
          <fieldset disabled={pending} className="min-w-0 border-0 p-0">
            <legend className="sr-only">Commitment board controls</legend>
            <div
              className="board"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`,
              }}
            >
              <AnimatePresence initial={false}>
                {columns.map((status, index) => {
                  const column = partition.buckets.get(status) ?? [];
                  return (
                    <motion.section
                      key={status}
                      exit={
                        reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }
                      }
                      initial={false}
                      layout={
                        layoutReady && !dragging && !reduced
                          ? "position"
                          : false
                      }
                      layoutDependency={grouping}
                      transition={springPhysics}
                      className={`board-column status-column-${status.toLowerCase().replaceAll(" ", "-")}`}
                    >
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
                              <CommitmentCard
                                key={task.id}
                                task={task}
                                index={index}
                                disabled={pending && mutationId === task.id}
                                actions={actions}
                                animateLayout={
                                  !dragging && animationIds.has(task.id)
                                }
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
                    </motion.section>
                  );
                })}
              </AnimatePresence>
            </div>
          </fieldset>
        </DragDropContext>
      )}
    </>
  );
}
