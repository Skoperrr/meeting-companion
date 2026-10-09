"use client";
import { useState } from "react";
import { Quote, CalendarDays, UserRound, Link2 } from "lucide-react";
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
  const [quote, setQuote] = useState<Task | null>(null);
  const [saving, setSaving] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<TaskFilters>({
    assignee: "",
    priority: "",
    status: "",
  });
  const visible = filterTasks(tasks, filters);
  const assignees = [...new Set(tasks.map((t) => t.assigned_to))].sort((a, b) =>
    a.localeCompare(b),
  );
  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow">03 / FOLLOW THROUGH</span>
          <h2>Action board</h2>
          <p className="muted">Every task has a meeting behind it.</p>
        </div>
        <span className="count-pill">{tasks.length} action items</span>
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
          Showing {visible.length} of {tasks.length} tasks
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
                {items.map((t) => (
                  <article className="task-card" key={t.id}>
                    <div className="card-top">
                      <span
                        className={`badge priority-${t.priority.toLowerCase()}`}
                      >
                        {t.priority === "Med" ? "Medium" : t.priority} priority
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`View evidence for ${t.title}`}
                        onClick={() => setQuote(t)}
                      >
                        <Quote size={16} />
                      </button>
                    </div>
                    <h4>{t.title}</h4>
                    <p>{t.description}</p>
                    <div className="task-meta">
                      <span>
                        <UserRound size={14} />
                        {t.assigned_to}
                      </span>
                      <span>
                        <CalendarDays size={14} />
                        {t.due_date}
                      </span>
                    </div>
                    <button
                      className="source-link"
                      onClick={() => onMeeting(t.meeting_id)}
                    >
                      <Link2 size={14} />
                      {t.meeting_title}
                    </button>
                    <label className="status-label">
                      Status
                      <select
                        disabled={saving.includes(t.id)}
                        value={t.status}
                        onChange={async (e) => {
                          const next = e.target.value;
                          setSaving((x) => [...x, t.id]);
                          setError("");
                          try {
                            const r = await fetch(
                              `/api/tasks/${encodeURIComponent(t.id)}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: next }),
                              },
                            );
                            if (!r.ok)
                              throw new Error(
                                ((await r.json()) as { error: string }).error,
                              );
                            await onUpdated();
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Update failed.",
                            );
                          } finally {
                            setSaving((x) => x.filter((id) => id !== t.id));
                          }
                        }}
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
                {!items.length && (
                  <div className="column-empty">No tasks here yet</div>
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
