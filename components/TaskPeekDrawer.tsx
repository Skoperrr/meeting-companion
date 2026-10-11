"use client";
import { useEffect, useRef } from "react";
import { X, Quote, ArrowUpRight } from "lucide-react";
import { statuses, type Task } from "@/lib/schemas";
import AssigneeAvatar from "./AssigneeAvatar";
export default function TaskPeekDrawer({
  task,
  saving,
  onClose,
  onStatusChange,
  onMeeting,
}: {
  task: Task;
  saving: boolean;
  onClose: () => void;
  onStatusChange: (status: Task["status"]) => Promise<void>;
  onMeeting: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="task-peek-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="peek-drawer m-0 ml-auto h-dvh max-h-none w-full max-w-lg overflow-y-auto border-l border-white/10 bg-zinc-950 p-6 text-zinc-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-indigo-300">
          Quick peek · Task details
        </span>
        <button
          type="button"
          aria-label="Close quick peek"
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-white/10 focus-visible:outline-indigo-400"
        >
          <X size={20} />
        </button>
      </div>
      <h2
        id="task-peek-title"
        className="mt-8 text-2xl font-semibold leading-snug"
      >
        {task.title}
      </h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
        {task.description}
      </p>
      <dl className="my-8 grid grid-cols-2 gap-6 text-sm">
        <div>
          <dt className="mb-2 text-zinc-500">Assignee</dt>
          <dd className="flex items-center gap-2">
            <AssigneeAvatar name={task.assigned_to} />
            {task.assigned_to}
          </dd>
        </div>
        <div>
          <dt className="mb-2 text-zinc-500">Priority</dt>
          <dd className="inline-flex rounded-full bg-indigo-400/10 px-3 py-1 text-indigo-200">
            {task.priority}
          </dd>
        </div>
        <div>
          <dt className="mb-2 text-zinc-500">Status</dt>
          <dd>
            <select
              aria-label="Task status"
              disabled={saving}
              value={task.status}
              onChange={(e) =>
                void onStatusChange(e.target.value as Task["status"])
              }
              className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-zinc-100 disabled:opacity-50"
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </dd>
        </div>
        <div>
          <dt className="mb-2 text-zinc-500">Deadline</dt>
          <dd>{task.due_date}</dd>
        </div>
      </dl>
      <div className="border-t border-white/10 pt-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Quote size={18} className="text-indigo-400" />
          Why this task was created
        </h3>
        <blockquote className="mt-4 whitespace-pre-wrap break-words border-l-2 border-indigo-400 pl-4 text-sm leading-7 text-zinc-300">
          {task.transcript_quote}
        </blockquote>
        <button
          type="button"
          onClick={() => {
            window.location.hash = `quote=${encodeURIComponent(task.transcript_quote)}`;
            onClose();
            onMeeting(task.meeting_id);
          }}
          className="mt-6 flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200"
        >
          {task.meeting_title}
          <ArrowUpRight size={16} />
        </button>
      </div>
    </dialog>
  );
}
