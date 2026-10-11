"use client";
export default function BatchActionBar({
  count,
  assignees,
  disabled,
  onApprove,
  onAssign,
  onDelete,
  onClear,
}: {
  count: number;
  assignees: string[];
  disabled: boolean;
  onApprove: () => void;
  onAssign: (name: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (!count) return null;
  return (
    <div
      role="region"
      aria-label="Selected task actions"
      className="batch-dock fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-3xl border border-botanical-border bg-botanical-paper/95 p-4 shadow-paper backdrop-blur-md"
    >
      <span role="status" className="text-xs text-botanical-muted">
        {count} selected
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onApprove}
        className="botanical-primary"
      >
        Approve Selected
      </button>
      <select
        aria-label="Assign selected tasks to"
        disabled={disabled}
        value=""
        onChange={(e) => {
          if (e.target.value) onAssign(e.target.value);
        }}
        className="rounded-full border border-botanical-border bg-botanical-linen p-2 text-sm text-botanical-forest"
      >
        <option value="">Assign Selected To…</option>
        {[...new Set(["Unassigned", ...assignees])].map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="rounded-full bg-red-100 px-4 py-2 text-sm text-red-700"
      >
        Delete Selected
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className="text-xs text-botanical-muted"
      >
        Clear selection
      </button>
    </div>
  );
}
