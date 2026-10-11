"use client";
import { fluidEase } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Draggable } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical } from "lucide-react";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import type { Task } from "@/lib/schemas";
import AssigneeAvatar from "./AssigneeAvatar";
import TaskCard from "./TaskCard";
import TaskPeekDrawer from "./TaskPeekDrawer";
export type CardActions = {
  due: (id: string, value: string) => Promise<void>;
  status: (id: string, value: Task["status"]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  meeting: (id: string) => void;
  assignee: (name: string) => void;
};
type Props = {
  task: Task;
  index: number;
  disabled: boolean;
  actions: CardActions;
};
function CommitmentCard({ task, index, disabled, actions }: Props) {
  const quoteId = useId();
  const onDueChange = useCallback(
    (value: string) => actions.due(task.id, value),
    [actions, task.id],
  );
  const onStatusChange = useCallback(
    (value: Task["status"]) => actions.status(task.id, value),
    [actions, task.id],
  );
  const onDelete = useCallback(
    () => actions.remove(task.id),
    [actions, task.id],
  );
  const onMeeting = actions.meeting;
  const onAssignee = actions.assignee;
  const reduced = useReducedMotion();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const openEvidence = useCallback(() => setEvidence(true), []);
  const hovered = useRef(false);
  const card = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const peek = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.defaultPrevented ||
        evidence ||
        document.querySelector("dialog[open]") ||
        (!hovered.current && !card.current?.contains(document.activeElement))
      )
        return;
      if (
        target instanceof Element &&
        target.closest(
          'button,input,textarea,select,a,[contenteditable="true"],[role="button"]',
        )
      )
        return;
      event.preventDefault();
      setEvidence(true);
    };
    window.addEventListener("keydown", peek);
    return () => window.removeEventListener("keydown", peek);
  }, [evidence]);
  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={disabled || evidence}
    >
      {(provided, snapshot) => (
        <div
          ref={(node) => {
            provided.innerRef(node);
            card.current = node;
          }}
          tabIndex={0}
          aria-label={`${task.title}. Press Space for quick peek.`}
          className="craft-card-focus rounded-xl"
          onMouseEnter={() => {
            hovered.current = true;
          }}
          onMouseLeave={() => {
            hovered.current = false;
          }}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
        >
          <div
            className={`commitment-card rounded-xl border bg-surface-base transition-shadow duration-300 ${snapshot.isDragging ? "is-dragging border-white/20 bg-surface-elevated shadow-none" : "border-white/[.08]"}`}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <AssigneeAvatar
                name={task.assigned_to}
                disabled={disabled}
                onClick={() => onAssignee(task.assigned_to)}
              />
              <button
                type="button"
                {...provided.dragHandleProps}
                disabled={disabled}
                aria-label={`Drag ${task.title}; press Space to lift, arrows to move, Space to drop`}
                className="cursor-grab rounded-md p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 active:cursor-grabbing disabled:cursor-not-allowed"
              >
                <GripVertical size={18} />
              </button>
            </div>
            <label className="mx-4 mt-4 flex items-center gap-3 text-xs text-text-secondary">
              <span className="shrink-0">Move task</span>
              <select
                aria-label={`Move ${task.title} to status`}
                value={task.status}
                disabled={disabled}
                onChange={(event) =>
                  void onStatusChange(event.target.value as Task["status"])
                }
                className="min-w-0 flex-1 rounded-lg border border-white/[.12] bg-surface-base p-2 text-xs text-white"
              >
                {(
                  [
                    "To Do",
                    "In Progress",
                    "Blocked",
                    "In Review",
                    "Completed",
                  ] as const
                ).map((status) => (
                  <option key={status} value={status}>
                    Move to {status}
                  </option>
                ))}
              </select>
            </label>
            <div className={snapshot.isDragging ? "relative z-10" : ""}>
              <AnimatePresence initial={false}>
                <TaskCard
                  key={task.id}
                  isDragging={snapshot.isDragging}
                  task={task}
                  saving={disabled}
                  onDueChange={onDueChange}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onMeeting={onMeeting}
                  onEvidence={openEvidence}
                />
              </AnimatePresence>
              <button
                type="button"
                aria-expanded={quoteOpen}
                aria-controls={quoteId}
                onClick={() => setQuoteOpen((current) => !current)}
                className="flex w-full items-center justify-between border-t border-white/[.08] px-5 py-3 text-left text-xs text-text-secondary"
              >
                Verbatim Quote{" "}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-500 ${quoteOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {quoteOpen && (
                  <motion.div
                    key="quote"
                    id={quoteId}
                    role="region"
                    aria-label={`Transcript evidence for ${task.title}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: reduced ? 0 : 0.6,
                      ease: fluidEase,
                    }}
                    className="overflow-hidden"
                  >
                    <blockquote className="mx-5 mb-5 whitespace-pre-wrap border-l border-white/20 pl-4 text-xs leading-7 text-text-secondary">
                      {task.transcript_quote}
                    </blockquote>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {evidence && (
            <TaskPeekDrawer
              task={task}
              saving={disabled}
              onStatusChange={onStatusChange}
              onMeeting={onMeeting}
              onClose={() => setEvidence(false)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}

export default memo(
  CommitmentCard,
  (previous, next) =>
    previous.index === next.index &&
    previous.disabled === next.disabled &&
    previous.actions === next.actions &&
    Object.keys(previous.task).length === Object.keys(next.task).length &&
    (Object.keys(previous.task) as (keyof Task)[]).every((key) =>
      Object.is(previous.task[key], next.task[key]),
    ),
);
