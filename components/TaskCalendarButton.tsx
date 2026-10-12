"use client";
import { CalendarPlus } from "lucide-react";
import type { Task } from "@/lib/schemas";
import { taskCalendarEvent } from "@/lib/calendar";
export default function TaskCalendarButton({
  task,
  referenceDate,
  compact = false,
}: {
  task: Task;
  referenceDate?: string;
  compact?: boolean;
}) {
  const event = taskCalendarEvent(task, referenceDate);
  if (!event) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Add to Google Calendar"
        aria-label={`Add ${task.title} to Google Calendar${event.usedFallback ? " (suggested date; review before saving)" : ""}`}
        className="icon-button"
      >
        <CalendarPlus size={16} />
      </a>
      {event.usedFallback && !compact && (
        <span
          className="text-[10px] text-amber-700"
          title={`Suggested date: ${event.dateLabel}. Review before saving.`}
        >
          Suggested date
        </span>
      )}
    </span>
  );
}
