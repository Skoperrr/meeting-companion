import { taskCalendarEvent } from "./calendar.ts";
import type { Task } from "./schemas.ts";
export function isTaskOverdue(
  task: Pick<Task, "due_date" | "status" | "meeting_date">,
  now = new Date(),
): boolean {
  if (task.status === "Completed" || !Number.isFinite(now.valueOf()))
    return false;
  const deadline = task.due_date.trim();
  if (!deadline || /^(not specified|unassigned)$/i.test(deadline)) return false;
  // Relative dates require the original meeting date; never anchor them to a moving today.
  if (!task.meeting_date && !/\d{4}/.test(deadline)) return false;
  const event = taskCalendarEvent(
    {
      title: "",
      description: "",
      assigned_to: "",
      transcript_quote: "",
      due_date: deadline,
    },
    task.meeting_date,
    now,
  );
  if (!event || event.usedFallback) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return event.dateLabel < today;
}
