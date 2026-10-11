"use client";
import { assigneeAppearance } from "@/lib/avatar";
export default function AssigneeAvatar({
  name,
  onClick,
  disabled = false,
}: {
  name: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const appearance = assigneeAppearance(name);
  const label = name.trim() || "Unassigned";
  const className =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ring-1 ring-white/20 transition-transform duration-200 motion-reduce:transition-none";
  return onClick ? (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={`Filter tasks assigned to ${label}`}
      aria-label={`Filter tasks assigned to ${label}`}
      style={{
        background: appearance.background,
        color: appearance.foreground,
      }}
      className={`${className} hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50`}
    >
      {appearance.initials}
    </button>
  ) : (
    <span
      style={{
        background: appearance.background,
        color: appearance.foreground,
      }}
      className={className}
      role="img"
      aria-label={label}
    >
      {appearance.initials}
    </span>
  );
}
