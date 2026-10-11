"use client";
export default function DashboardOverview({
  completed,
  total,
  onPriority,
  onDue,
}: {
  completed: number;
  total: number;
  onPriority: () => void;
  onDue: () => void;
}) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section
      aria-labelledby="dashboard-heading"
      className="craft-overview grid grid-cols-1 gap-8 lg:grid-cols-12"
    >
      <div className="lg:col-span-7">
        <p className="craft-label">Workspace overview</p>
        <h1
          id="dashboard-heading"
          className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.02em] text-white"
        >
          Meetings, with follow-through.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-text-secondary">
          Review the commitments. Keep the evidence. Move the work forward.
        </p>
      </div>
      <div className="lg:col-span-5">
        <p className="craft-label">Task completion</p>
        <p className="mt-4 text-xl font-semibold text-white">
          {completed}{" "}
          <span className="text-sm font-normal text-text-secondary">
            of {total} completed · {percent}%
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Task completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="my-4 h-1 overflow-hidden rounded bg-white/10"
        >
          <div
            style={{ width: `${percent}%` }}
            className="h-full bg-white/80 transition-[width] duration-300 motion-reduce:transition-none"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="craft-button" onClick={onPriority}>
            High priority
          </button>
          <button type="button" className="craft-button" onClick={onDue}>
            Due this week
          </button>
        </div>
      </div>
    </section>
  );
}
