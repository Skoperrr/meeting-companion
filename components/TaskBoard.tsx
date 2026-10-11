"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import KanbanBoard from "./KanbanBoard";
import { statuses, type Task } from "@/lib/schemas";
import { filterTasks, type TaskFilters } from "@/lib/productivity";
export default function TaskBoard({
  tasks,
  onUpdated,
  onMeeting,
}: {
  tasks: Task[];
  onUpdated: () => Promise<void>;
  onMeeting: (id: string) => void;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.toString();
  const read = () => ({
    assignee: params.get("assignee") ?? "",
    priority: (["High", "Med", "Low"].includes(params.get("priority") ?? "")
      ? params.get("priority")
      : "") as TaskFilters["priority"],
    status: (statuses.includes(params.get("status") as Task["status"])
      ? params.get("status")
      : "") as TaskFilters["status"],
    search: params.get("q") ?? "",
  });
  const [source, setSource] = useState(query);
  const [filters, setLocalFilters] = useState(read);
  if (source !== query) {
    setSource(query);
    setLocalFilters(read());
  }
  function setFilters(
    next: typeof filters | ((current: typeof filters) => typeof filters),
  ) {
    const value = typeof next === "function" ? next(filters) : next;
    setLocalFilters(value);
    const updated = new URLSearchParams(params.toString());
    for (const [key, text] of Object.entries({
      assignee: value.assignee,
      priority: value.priority,
      status: value.status,
      q: value.search,
    })) {
      if (text) updated.set(key, text);
      else updated.delete(key);
    }
    router.replace(
      `${pathname}${updated.size ? "?" + updated.toString() : ""}`,
      { scroll: false },
    );
  }
  const visible = filterTasks(tasks, filters).filter(
    (task) =>
      !filters.search ||
      [task.title, task.description, task.assigned_to].some((text) =>
        text.toLowerCase().includes(filters.search.toLowerCase()),
      ),
  );
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
        <label className="flex flex-col gap-1 text-xs text-botanical-muted">
          Search tasks
          <input
            type="search"
            value={filters.search}
            onChange={(e) =>
              setFilters((current) => ({ ...current, search: e.target.value }))
            }
            placeholder="Find a commitment…"
            className="rounded-full border border-botanical-border p-2 text-sm"
          />
        </label>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            setFilters({ assignee: "", priority: "", status: "", search: "" })
          }
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
      <KanbanBoard
        tasks={visible}
        onUpdated={onUpdated}
        onMeeting={onMeeting}
        onAssignee={(name) =>
          setFilters((current) => ({ ...current, assignee: name }))
        }
      />
    </>
  );
}
