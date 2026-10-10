import TaskCardSkeleton from "@/components/TaskCardSkeleton";
import { statuses } from "@/lib/schemas";
export default function Loading() {
  return (
    <main className="p-6 sm:p-10" aria-busy="true">
      <p role="status" className="sr-only">
        Loading your task board...
      </p>
      <div
        aria-hidden="true"
        className="mb-8 h-8 w-48 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
      />
      <div className="grid gap-5 overflow-x-auto lg:grid-cols-5">
        {statuses.map((status) => (
          <section key={status} className="min-w-56 rounded-xl bg-slate-50 p-3">
            <h2 className="mb-4 text-sm font-semibold text-slate-600">
              {status}
            </h2>
            <div className="space-y-3">
              <TaskCardSkeleton />
              <TaskCardSkeleton />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
