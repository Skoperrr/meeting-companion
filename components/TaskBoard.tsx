"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "./TaskCard";
import { statuses, type Task } from "@/lib/schemas";
import { filterTasks, type TaskFilters } from "@/lib/productivity";
import QuoteModal from "./QuoteModal";
export default function TaskBoard({
  tasks,
  onUpdated,
  onMeeting,
}: {
  tasks: Task[];
  onUpdated: () => Promise<void>;
  onMeeting: (id: string) => void;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState<string[]>([]);
  const deleteLocks = useRef(new Set<string>());
  const available = tasks.filter((task) => !removed.includes(task.id));
  async function removeTask(id: string) {
    if (deleteLocks.current.has(id)) return;
    deleteLocks.current.add(id);
    setRemoved((ids) => [...ids, id]);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw new Error(
          body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
            ? body.error
            : "Task deletion failed. Please retry.",
        );
      }
    } catch (cause) {
      setRemoved((ids) => ids.filter((value) => value !== id));
      setError(
        cause instanceof Error ? cause.message : "Task deletion failed.",
      );
      return;
    } finally {
      deleteLocks.current.delete(id);
    }
    router.refresh();
    try {
      await onUpdated();
    } catch {
      setError(
        "Task deleted, but the board could not refresh. Reload to update the metrics.",
      );
    }
  }
  async function changeStatus(task: Task, status: Task["status"]) {
    setSaving((ids) => [...ids, task.id]);
    setError("");
    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
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
            : "Task update failed.",
        );
      }
      await onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task update failed.");
    } finally {
      setSaving((ids) => ids.filter((id) => id !== task.id));
    }
  }
  const [quote, setQuote] = useState<Task | null>(null);
  const [saving, setSaving] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<TaskFilters>({
    assignee: "",
    priority: "",
    status: "",
  });
  const visible = filterTasks(available, filters);
  const assignees = [...new Set(available.map((t) => t.assigned_to))].sort(
    (a, b) => a.localeCompare(b),
  );
  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow">03 / FOLLOW THROUGH</span>
          <h2>Action board</h2>
          <p className="muted">Every task has a meeting behind it.</p>
        </div>
        <span className="count-pill">{available.length} action items</span>
      </div>
      <div
        className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        aria-label="Task filters"
      >
        <label className="flex min-w-40 flex-col gap-1 text-xs font-semibold text-slate-600">
          Assignee
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={filters.assignee}
            onChange={(e) =>
              setFilters((f) => ({ ...f, assignee: e.target.value }))
            }
          >
            <option value="">All assignees</option>
            {assignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-32 flex-col gap-1 text-xs font-semibold text-slate-600">
          Priority
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                priority: e.target.value as TaskFilters["priority"],
              }))
            }
          >
            <option value="">All priorities</option>
            {(["High", "Med", "Low"] as const).map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-xs font-semibold text-slate-600">
          Status
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value as TaskFilters["status"],
              }))
            }
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary"
          onClick={() => setFilters({ assignee: "", priority: "", status: "" })}
        >
          Clear filters
        </button>
        <span role="status" className="ml-auto text-sm text-slate-500">
          Showing {visible.length} of {available.length} tasks
        </span>
      </div>
      {!visible.length && tasks.length > 0 && (
        <p className="mb-4 text-sm text-slate-600">
          No tasks match these filters. Clear filters to show all tasks.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="board">
        {statuses.map((status, i) => {
          const items = visible.filter((t) => t.status === status);
          return (
            <section className="board-column" key={status}>
              <div className="column-heading">
                <span className={`status-marker marker-${i}`} />
                <h3>{status}</h3>
                <span>{items.length}</span>
              </div>
              <div className="column-cards">
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    saving={saving.includes(task.id)}
                    onStatusChange={(status) => changeStatus(task, status)}
                    onDelete={() => removeTask(task.id)}
                    onMeeting={onMeeting}
                    onEvidence={() => setQuote(task)}
                  />
                ))}
                {!items.length && (
                  <div className="rounded-xl border border-dotted border-slate-300 px-4 py-8 text-center text-xs text-slate-400">
                    No tasks here
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {quote && (
        <QuoteModal
          title={quote.title}
          quote={quote.transcript_quote}
          onClose={() => setQuote(null)}
        />
      )}
    </>
  );
}
