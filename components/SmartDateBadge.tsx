"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { spokenDeadline } from "@/lib/smart-date";
export default function SmartDateBadge({
  value,
  referenceDate,
  disabled = false,
  onChange,
}: {
  value: string;
  referenceDate?: string;
  disabled?: boolean;
  onChange: (value: string) => Promise<void>;
}) {
  const [today, setToday] = useState<Date | null>(null);
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDetailsElement>(null);
  const lock = useRef(false);
  useEffect(() => {
    const tick = () => setToday(new Date());
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node))
        ref.current?.removeAttribute("open");
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ref.current?.removeAttribute("open");
        ref.current?.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const raw = optimistic ?? value;
  const anchor = referenceDate
    ? new Date(`${referenceDate.slice(0, 10)}T12:00:00`)
    : today;
  const date = anchor ? spokenDeadline(raw, anchor) : null;
  const days = date && today ? differenceInCalendarDays(date, today) : null;
  async function save(next: string) {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setOptimistic(next);
    try {
      await onChange(next);
      ref.current?.removeAttribute("open");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update deadline.");
    } finally {
      setOptimistic(null);
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <div className="relative">
      <details ref={ref}>
        <summary
          onClick={(e) => {
            if (disabled || busy) e.preventDefault();
          }}
          className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-botanical-border bg-botanical-linen px-2.5 py-1 text-xs text-botanical-sage"
          title={`Original deadline: ${value}`}
        >
          <CalendarDays size={13} />
          {date
            ? `${format(date, "EEE, d MMM")}${days === null ? "" : days === 0 ? " • today" : days === 1 ? " • tomorrow" : days > 0 ? ` • in ${days} days` : ` • ${Math.abs(days)} days overdue`}`
            : raw}
          {busy ? " · saving…" : ""}
        </summary>
        <div className="absolute left-0 top-full z-30 mt-2 w-60 rounded-2xl border border-botanical-border bg-botanical-paper p-4 shadow-paper">
          <label className="text-xs text-botanical-muted">
            Adjust deadline
            <input
              type="date"
              aria-label="Adjust task deadline"
              disabled={disabled || busy}
              value={date ? format(date, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                if (e.target.value) void save(e.target.value);
              }}
              className="mt-2 w-full rounded-lg border border-botanical-border p-2"
            />
          </label>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void save("Not specified")}
            className="mt-3 text-xs text-botanical-sage"
          >
            Remove deadline
          </button>
        </div>
      </details>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
