"use client";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/schemas";
import TaskCard from "./TaskCard";
import { X, Quote } from "lucide-react";
function EvidenceDrawer({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={`Transcript evidence for ${task.title}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-md border-l border-white/10 bg-zinc-950 p-6 text-zinc-100 shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
          Source evidence
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence drawer"
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>
      <h2 className="mt-8 text-xl font-semibold">{task.title}</h2>
      <p className="mt-2 text-sm text-zinc-400">{task.meeting_title}</p>
      <Quote className="mt-8 text-indigo-400" />
      <blockquote className="mt-4 whitespace-pre-wrap break-words border-l-2 border-indigo-400 pl-4 text-sm leading-7">
        {task.transcript_quote}
      </blockquote>
      <p className="mt-6 text-xs text-zinc-500">
        Verbatim excerpt from the source meeting.
      </p>
    </dialog>
  );
}
export default function KanbanCard({
  task,
  index,
  disabled,
  onStatusChange,
  onDelete,
  onMeeting,
}: {
  task: Task;
  index: number;
  disabled: boolean;
  onStatusChange: (status: Task["status"]) => Promise<void>;
  onDelete: () => Promise<void>;
  onMeeting: (id: string) => void;
}) {
  const [evidence, setEvidence] = useState(false);
  const initials =
    task.assigned_to === "Unassigned"
      ? "?"
      : task.assigned_to
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();
  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={disabled || evidence}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
        >
          <div
            className={`rounded-xl border bg-white transition-shadow duration-200 ${snapshot.isDragging ? "border-indigo-400 shadow-2xl ring-2 ring-indigo-300/50" : "border-transparent"}`}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <span
                title={task.assigned_to}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700"
                aria-label={`Assignee: ${task.assigned_to}`}
              >
                {initials}
              </span>
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
            <div
              className={
                snapshot.isDragging
                  ? "relative z-10 scale-105 motion-reduce:scale-100"
                  : ""
              }
            >
              <TaskCard
                task={task}
                saving={disabled}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onMeeting={onMeeting}
                onEvidence={() => setEvidence(true)}
              />
            </div>
          </div>
          {evidence && (
            <EvidenceDrawer task={task} onClose={() => setEvidence(false)} />
          )}
        </div>
      )}
    </Draggable>
  );
}
