"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Link2, Quote, Trash2, UserRound } from "lucide-react";
import { statuses, type Task } from "@/lib/schemas";
import { isTaskOverdue } from "@/lib/task-overdue";
import SmartDateBadge from "./SmartDateBadge";
import TaskCalendarButton from "./TaskCalendarButton";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
type Props = {
  task: Task;
  saving: boolean;
  onDueChange: (value: string) => Promise<void>;
  onStatusChange: (status: Task["status"]) => Promise<void>;
  onDelete: () => Promise<void>;
  onMeeting: (id: string) => void;
  onEvidence: () => void;
};
export default function TaskCard({
  task,
  saving,
  onDueChange,
  onStatusChange,
  onDelete,
  onMeeting,
  onEvidence,
}: Props) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60000);
    const initial = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(initial);
    };
  }, []);
  const overdue = now !== null && isTaskOverdue(task, now);
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      lock.current = false;
      setDeleting(false);
      setConfirm(false);
    }
  }
  return (
    <article className="task-card border transition-all duration-300 hover:-translate-y-0.5 hover:border-botanical-sage hover:shadow-paper motion-reduce:transform-none motion-reduce:transition-none">
      <div className="card-top">
        <TaskCalendarButton task={task} referenceDate={task.meeting_date} />
        <span className={`badge priority-${task.priority.toLowerCase()}`}>
          {task.priority === "Med" ? "Medium" : task.priority} priority
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label={`View evidence for ${task.title}`}
          onClick={onEvidence}
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          disabled={saving || deleting}
          onClick={() => setConfirm(true)}
          aria-label={`Delete task ${task.title}`}
          title="Delete task"
          className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-40"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      <div className="task-meta">
        <span>
          <UserRound size={14} />
          {task.assigned_to}
        </span>
        <SmartDateBadge
          value={task.due_date}
          referenceDate={task.meeting_date}
          disabled={saving || deleting}
          onChange={onDueChange}
        />
        {overdue && (
          <span className="text-red-700">
            <AlertCircle size={14} />
            <span className="sr-only">Overdue</span>
          </span>
        )}
      </div>
      <button
        type="button"
        className="source-link"
        onClick={() => {
          window.location.hash = `quote=${encodeURIComponent(task.transcript_quote)}`;
          onMeeting(task.meeting_id);
        }}
      >
        <Link2 size={14} />
        {task.meeting_title}
      </button>
      <button
        type="button"
        onClick={onEvidence}
        className="botanical-evidence-preview"
        aria-label={`Read full evidence for ${task.title}`}
      >
        “
        {task.transcript_quote.length > 130
          ? task.transcript_quote.slice(0, 130) + "…"
          : task.transcript_quote}
        ”
      </button>
      <label className="status-label">
        Status
        <select
          disabled={saving || deleting}
          value={task.status}
          onChange={(e) =>
            void onStatusChange(e.target.value as Task["status"])
          }
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {confirm && (
        <ConfirmDeleteModal
          title="Delete task"
          message="Are you sure you want to delete this task?"
          confirmLabel="Delete task"
          busy={deleting}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void remove()}
        />
      )}
    </article>
  );
}
