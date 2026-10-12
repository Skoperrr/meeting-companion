"use client";
import { fluidEase } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Draggable } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical, Quote } from "lucide-react";
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
  animateLayout: boolean;
  actions: CardActions;
};
const MemoAvatar = memo(AssigneeAvatar);
function CommitmentCard({
  task,
  index,
  disabled,
  animateLayout,
  actions,
}: Props) {
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
  const filterAssignee = useCallback(
    () => actions.assignee(task.assigned_to),
    [actions, task.assigned_to],
  );
  const reduced = useReducedMotion();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const compact = task.status === "Completed" && !expanded;
  const [evidence, setEvidence] = useState(false);
  const openEvidence = useCallback(() => setEvidence(true), []);
  const toggleQuote = useCallback(() => setQuoteOpen((value) => !value), []);
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
            className={`commitment-card performance-card rounded-2xl border bg-surface-base ${snapshot.isDragging ? "is-dragging border-white/20 bg-surface-elevated shadow-none" : "border-white/[.08]"}`}
          >
            <div
              className={
                compact
                  ? "flex flex-wrap items-center justify-end gap-1 p-3"
                  : "flex items-center justify-between gap-2 px-4 pt-3"
              }
            >
              {compact ? (
                <h4 className="w-full min-w-0 basis-full break-words pb-1 text-sm font-semibold leading-5 text-white">
                  {task.title}
                </h4>
              ) : (
                <MemoAvatar
                  name={task.assigned_to}
                  disabled={disabled}
                  onClick={filterAssignee}
                />
              )}
              {compact && (
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={`View evidence for ${task.title}`}
                  onClick={() => setEvidence(true)}
                >
                  <Quote size={16} aria-hidden="true" />
                </button>
              )}
              {task.status === "Completed" && (
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-expanded={!compact}
                  aria-label={`${compact ? "Expand" : "Collapse"} completed task ${task.title}`}
                  onClick={() => setExpanded((value) => !value)}
                >
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={compact ? "" : "rotate-180"}
                  />
                </button>
              )}
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
            {!compact && (
              <div className={snapshot.isDragging ? "relative z-10" : ""}>
                <AnimatePresence initial={false}>
                  <TaskCard
                    key={task.id}
                    isDragging={snapshot.isDragging}
                    animateLayout={animateLayout}
                    layoutRevision={index}
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
                  onClick={toggleQuote}
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
            )}
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
    previous.animateLayout === next.animateLayout &&
    previous.actions === next.actions &&
    Object.keys(previous.task).length === Object.keys(next.task).length &&
    (Object.keys(previous.task) as (keyof Task)[]).every((key) =>
      Object.is(previous.task[key], next.task[key]),
    ),
);
