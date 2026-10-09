import type { Meeting, Task } from "./schemas";
export type TaskFilters = {
  assignee: string;
  priority: "" | Task["priority"];
  status: "" | Task["status"];
};
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter(
    (t) =>
      (!filters.assignee || t.assigned_to === filters.assignee) &&
      (!filters.priority || t.priority === filters.priority) &&
      (!filters.status || t.status === filters.status),
  );
}
function inline(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/([\\`*_{}\[\]<>#!|])/g, "\\$1");
}
export function meetingMarkdown(meeting: Meeting, tasks: Task[]): string {
  const lines = [
    `# ${inline(meeting.title)}`,
    `Date: ${inline(meeting.meeting_date)}`,
    "",
    "## Summary",
    meeting.analysis.summary,
    "",
  ];
  for (const [heading, items] of [
    ["Key points", meeting.analysis.key_points],
    ["Decisions", meeting.analysis.decisions],
    ["Follow-ups", meeting.analysis.follow_ups],
  ] as const) {
    lines.push(
      `## ${heading}`,
      ...(items.length
        ? items.map((item) => `- ${inline(item)}`)
        : ["None recorded."]),
      "",
    );
  }
  lines.push("## Tasks");
  const linked = tasks.filter((t) => t.meeting_id === meeting.id);
  if (!linked.length) lines.push("No approved tasks.");
  for (const task of linked) {
    lines.push(
      `- [${task.status === "Completed" ? "x" : " "}] ${inline(task.title)}`,
      `  - Owner: ${inline(task.assigned_to)}`,
      `  - Due: ${inline(task.due_date)}`,
      `  - Priority: ${task.priority}`,
      `  - Status: ${task.status}`,
      `  - Description: ${inline(task.description)}`,
      `  - Evidence: ${inline(task.transcript_quote)}`,
    );
  }
  return lines.join("\n").trim() + "\n";
}
