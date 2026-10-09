import { escapeHtml, type WorkspaceAnalysis } from "./workspace-types.ts";
export type RecapEmailData = {
  dispatchId: string;
  title: string;
  meetingDate: string;
  documentUrl: string;
  analysis: WorkspaceAnalysis;
};
export type RecapEmailPayload = {
  from: string;
  subject: string;
  html: string;
  text: string;
};
export function buildMeetingRecapEmail(
  data: RecapEmailData,
  from: string,
): RecapEmailPayload {
  const url = new URL(data.documentUrl);
  if (
    url.protocol !== "https:" ||
    !["drive.google.com", "docs.google.com"].includes(url.hostname)
  )
    throw new Error("Invalid transcript evidence URL.");
  const e = escapeHtml;
  const tasks = data.analysis.proposed_tasks;
  const decisions = data.analysis.decisions.length
    ? data.analysis.decisions
        .map((d) => `<li style="margin:0 0 8px">${e(d)}</li>`)
        .join("")
    : "<li>No decisions recorded.</li>";
  const rows = tasks
    .map(
      (task) =>
        `<tr><td style="padding:16px;border-bottom:1px solid #e4e7eb;vertical-align:top"><strong>${e(task.title)}</strong><p style="margin:8px 0;font-size:13px;line-height:1.6">${e(task.description)}</p><blockquote style="margin:8px 0;padding-left:12px;border-left:3px solid #dbb657;color:#627085;font-size:12px;white-space:pre-wrap">${e(task.transcript_quote)}</blockquote></td><td style="padding:16px;border-bottom:1px solid #e4e7eb;vertical-align:top;font-size:13px">${e(task.assigned_to)}${task.assigned_email ? `<br><span style="color:#627085">${e(task.assigned_email)}</span>` : ""}</td><td style="padding:16px;border-bottom:1px solid #e4e7eb;vertical-align:top;font-size:13px">${e(task.due_date)}<br><strong>${e(task.priority)}</strong></td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f2ed;font-family:Arial,sans-serif;color:#1c2b3c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;margin:auto;background:#fff;border:1px solid #e4e7eb;border-radius:12px;overflow:hidden"><tr><td style="background:#17212b;padding:28px;color:#fff"><p style="margin:0 0 14px;font-size:11px;letter-spacing:2px;color:#dbb657">STRIDESHIFT / MEETING COMPANION</p><h1 style="margin:0;font-size:26px;line-height:1.3">${e(data.title)}</h1><p style="margin:12px 0 0;color:#bac4cf;font-size:13px">${e(data.meetingDate)}</p></td></tr><tr><td style="padding:28px"><p style="display:inline-block;padding:8px 12px;background:#fff5d6;color:#755916;font-size:12px;font-weight:bold">AI-GENERATED · AWAITING HUMAN REVIEW</p><h2 style="font-size:18px;margin:20px 0 12px">Meeting recap</h2><p style="line-height:1.75;white-space:pre-wrap">${e(data.analysis.summary)}</p><h2 style="font-size:18px;margin:28px 0 12px">Decisions</h2><ul style="padding-left:20px;line-height:1.7">${decisions}</ul><h2 style="font-size:18px;margin:28px 0 12px">Proposed action items</h2><p style="font-size:13px;color:#627085;line-height:1.6">These commitments have not yet been approved. Owners and deadlines should be verified against the source.</p><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><thead><tr style="background:#f3f5f7;text-align:left"><th scope="col" style="padding:12px;font-size:12px">Action &amp; evidence</th><th scope="col" style="padding:12px;font-size:12px">Owner</th><th scope="col" style="padding:12px;font-size:12px">Deadline / priority</th></tr></thead><tbody>${rows || '<tr><td colspan="3" style="padding:16px">No actionable commitments identified.</td></tr>'}</tbody></table><p style="margin:28px 0 0"><a href="${e(url.toString())}" style="color:#355f83;font-weight:bold">View source transcript in Google Drive</a></p><p style="margin:20px 0 0;font-size:12px;color:#627085;line-height:1.6">Sent to this meeting's calendar invitees. Google Drive permissions control access to the source transcript.</p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    data.title,
    data.meetingDate,
    "AI-generated proposals — awaiting human review",
    "",
    "Summary",
    data.analysis.summary,
    "",
    "Decisions",
    ...data.analysis.decisions.map((d) => `- ${d}`),
    "",
    "Proposed tasks",
    ...tasks.map(
      (task) =>
        `${task.title}\nOwner: ${task.assigned_to}${task.assigned_email ? ` (${task.assigned_email})` : ""}\nDue: ${task.due_date} | Priority: ${task.priority}\n${task.description}\nEvidence: ${task.transcript_quote}\n`,
    ),
    `Source: ${url}`,
  ].join("\n");
  if (Buffer.byteLength(html, "utf8") > 900000)
    throw new Error("Meeting recap exceeds the email size budget.");
  return {
    from,
    subject: `Meeting recap: ${data.title.replace(/[\r\n]/g, " ")}`,
    html,
    text,
  };
}
