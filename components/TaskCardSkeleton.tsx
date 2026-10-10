export default function TaskCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 motion-reduce:animate-none"
    >
      <div className="mb-5 flex justify-between">
        <div className="h-5 w-24 rounded bg-slate-200" />
        <div className="h-5 w-5 rounded bg-slate-200" />
      </div>
      <div className="mb-3 h-5 w-4/5 rounded bg-slate-200" />
      <div className="mb-2 h-3 w-full rounded bg-slate-100" />
      <div className="mb-6 h-3 w-3/4 rounded bg-slate-100" />
      <div className="mb-3 h-4 w-1/2 rounded bg-slate-200" />
      <div className="mb-5 h-4 w-2/3 rounded bg-slate-200" />
      <div className="h-9 w-full rounded-lg bg-slate-100" />
    </div>
  );
}
