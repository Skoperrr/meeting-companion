import type { Meeting, Task } from "./schemas.ts";
const htmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const slackEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*/g, "");
export function slackDigest(meeting: Meeting, tasks: Task[]): string {
  return [
    `*${slackEscape(meeting.title)}*`,
    meeting.meeting_date,
    slackEscape(meeting.analysis.summary),
    "",
    ":white_check_mark: *Decisions*",
    ...meeting.analysis.decisions.map((d) => `• ${slackEscape(d)}`),
    "",
    ":clipboard: *Action items*",
    ...tasks.map(
      (t) =>
        `${t.status === "Completed" ? ":white_check_mark:" : ":large_blue_circle:"} *${slackEscape(t.title)}*\n• Owner: ${slackEscape(t.assigned_to)} · Due: ${slackEscape(t.due_date)} · ${t.priority} · ${t.status}`,
    ),
  ].join("\n");
}
export function emailDigest(meeting: Meeting, tasks: Task[]): string {
  const cell = (s: string) =>
    `<td style="border:1px solid #ddd;padding:10px;vertical-align:top">${htmlEscape(s)}</td>`;
  return `<div style="font-family:Arial,sans-serif;color:#202124"><h1>${htmlEscape(meeting.title)}</h1><p>${htmlEscape(meeting.meeting_date)}</p><p style="white-space:pre-wrap">${htmlEscape(meeting.analysis.summary)}</p><h2>Decisions</h2><ul>${meeting.analysis.decisions.map((d) => `<li>${htmlEscape(d)}</li>`).join("")}</ul><h2>Action items</h2><table style="border-collapse:collapse;width:100%"><thead><tr>${["Task", "Owner", "Due", "Priority", "Status"].map((s) => `<th style="text-align:left;background:#f4f4f5;border:1px solid #ddd;padding:10px">${s}</th>`).join("")}</tr></thead><tbody>${tasks.map((t) => `<tr>${[t.title, t.assigned_to, t.due_date, t.priority, t.status].map(cell).join("")}</tr>`).join("")}</tbody></table></div>`;
}
export function taskCsv(tasks: Task[]): string {
  const field = (s: string) =>
    `"${(/^[\s]*[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"`;
  return (
    "\uFEFF" +
    [
      [
        "Summary",
        "Description",
        "Assignee",
        "Due Date",
        "Priority",
        "Status",
        "Source Meeting",
        "Evidence",
      ],
      ...tasks.map((t) => [
        t.title,
        t.description,
        t.assigned_to,
        t.due_date,
        t.priority,
        t.status,
        t.meeting_title,
        t.transcript_quote,
      ]),
    ]
      .map((row) => row.map(field).join(","))
      .join("\r\n")
  );
}
