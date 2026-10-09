import type { Task } from "./schemas";
export type CalendarEvent = {
  url: string;
  dateLabel: string;
  usedFallback: boolean;
};
const DAY = 86_400_000;
function validDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value
    ? d
    : null;
}
const dayCode = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
const timeCode = (d: Date) =>
  d
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
export function taskCalendarEvent(
  task: Pick<
    Task,
    "title" | "description" | "assigned_to" | "due_date" | "transcript_quote"
  >,
  referenceDate?: string,
  now = new Date(),
): CalendarEvent | null {
  const deadline = task.due_date.trim();
  if (!deadline || /^(not specified|unassigned)$/i.test(deadline)) return null;
  const text = deadline
    .toLowerCase()
    .replace(/^(by|on|before)\s+/, "")
    .trim();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const anchor = referenceDate ? (validDay(referenceDate) ?? today) : today;
  let start: Date | null = null;
  let timed = false;
  let usedFallback = false;
  // Require an explicit timezone for timed events. Ambiguous local times become all-day.
  if (
    /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(z|[+-]\d{2}:\d{2})$/i.test(
      text,
    ) &&
    validDay(text.slice(0, 10))
  ) {
    const parsed = new Date(text);
    if (Number.isFinite(parsed.valueOf())) {
      start = parsed;
      timed = true;
    }
  }
  if (!start) start = validDay(text);
  if (!start && /^\d{4}-\d{2}-\d{2}[ t]/.test(text))
    start = validDay(text.slice(0, 10));
  if (!start) {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const named = text.match(
      /^(?:([a-z]+) (\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th)? ([a-z]+))(?:,? (\d{4}))?$/,
    );
    if (named) {
      const month = months.findIndex(
        (value) =>
          value === (named[1] ?? named[4]) ||
          value.slice(0, 3) === (named[1] ?? named[4]),
      );
      if (month >= 0) {
        let year = named[5] ? Number(named[5]) : anchor.getUTCFullYear();
        const dateText = () =>
          `${year}-${String(month + 1).padStart(2, "0")}-${String(named[2] ?? named[3]).padStart(2, "0")}`;
        start = validDay(dateText());
        if (!named[5] && start && start < anchor) {
          year += 1;
          start = validDay(dateText());
        }
      }
    }
  }
  if (!start && /^(today|tomorrow)$/.test(text))
    start = new Date(anchor.valueOf() + (text === "tomorrow" ? DAY : 0));
  const days = text.match(/^(?:in )?(\d{1,3}) days?(?: from now)?$/);
  if (!start && days)
    start = new Date(anchor.valueOf() + Number(days[1]) * DAY);
  const weekday = text.match(
    /^(next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/,
  );
  if (!start && weekday) {
    const target = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].indexOf(weekday[2]);
    let delta = (target - anchor.getUTCDay() + 7) % 7;
    if (weekday[1] === "next " && delta === 0) delta = 7;
    start = new Date(anchor.valueOf() + delta * DAY);
  }
  if (!start && text === "next week")
    start = new Date(anchor.valueOf() + 7 * DAY);
  if (!start) {
    start = new Date(today.valueOf() + 3 * DAY);
    usedFallback = true;
  }
  const end = new Date(start.valueOf() + (timed ? 3_600_000 : DAY));
  const format = timed ? timeCode : dayCode;
  const details = [
    task.description,
    `Assigned owner: ${task.assigned_to}`,
    `Original deadline: ${task.due_date}`,
    "Transcript evidence:",
    task.transcript_quote,
    ...(usedFallback
      ? [
          "Date suggestion: deadline could not be resolved; review this date before saving.",
        ]
      : []),
  ].join("\n\n");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", task.title);
  url.searchParams.set("details", details);
  url.searchParams.set("dates", `${format(start)}/${format(end)}`);
  return {
    url: url.toString(),
    dateLabel: start.toISOString().slice(0, 10),
    usedFallback,
  };
}
