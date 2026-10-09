import { z } from "zod";
import { analysisSchema, proposalSchema } from "./schemas.ts";
export const attendeeSchema = z
  .object({
    name: z.string().trim().min(1).max(150).nullable(),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
  })
  .strict();
export type Attendee = z.infer<typeof attendeeSchema>;
export const workspaceAnalysisSchema = analysisSchema.extend({
  proposed_tasks: z
    .array(
      proposalSchema.extend({ assigned_email: z.string().email().nullable() }),
    )
    .max(50),
});
export type WorkspaceAnalysis = z.infer<typeof workspaceAnalysisSchema>;
export const workspaceMeetingSchema = z
  .object({
    calendarId: z.string(),
    eventId: z.string(),
    title: z.string().min(1).max(200),
    meetingDate: z.string(),
    meetUrl: z.string().url(),
    documentId: z.string(),
    documentUrl: z.string().url(),
    transcript: z.string().min(20).max(100000),
    attendees: z.array(attendeeSchema).min(1).max(100),
  })
  .strict();
export type WorkspaceMeeting = z.infer<typeof workspaceMeetingSchema>;
export const meetSyncSchema = z
  .object({
    calendarEventId: z.string().min(1).max(1024).optional(),
    calendarId: z.string().min(1).max(254).default("primary"),
    meetUrl: z.string().url().optional(),
  })
  .strict()
  .refine(
    (v) => Boolean(v.calendarEventId) !== Boolean(v.meetUrl),
    "Provide exactly one calendarEventId or meetUrl.",
  );
export type MeetSyncInput = z.infer<typeof meetSyncSchema>;
export function uniqueAttendees(values: Attendee[]): Attendee[] {
  const byEmail = new Map<string, Attendee>();
  for (const item of values) {
    const attendee = attendeeSchema.parse(item);
    const prior = byEmail.get(attendee.email);
    if (!prior || (!prior.name && attendee.name))
      byEmail.set(attendee.email, attendee);
  }
  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}
export function speakerAliases(
  attendees: Attendee[],
): { alias: string; name: string; email: string }[] {
  const candidates = new Map<string, { alias: string; attendee: Attendee }[]>();
  for (const attendee of uniqueAttendees(attendees)) {
    if (!attendee.name) continue;
    for (const alias of new Set([
      attendee.name,
      attendee.name.split(/\s+/)[0],
    ])) {
      const key = alias.toLocaleLowerCase("en");
      const list = candidates.get(key) ?? [];
      list.push({ alias, attendee });
      candidates.set(key, list);
    }
  }
  return [...candidates.values()]
    .filter((items) => items.length === 1)
    .map(([item]) => ({
      alias: item.alias,
      name: item.attendee.name!,
      email: item.attendee.email,
    }));
}
export function validateWorkspaceEvidence(
  analysis: WorkspaceAnalysis,
  transcript: string,
  attendees: Attendee[],
) {
  const aliases = speakerAliases(attendees);
  for (const task of analysis.proposed_tasks) {
    if (!transcript.includes(task.transcript_quote))
      throw new Error("AI quote is not verbatim in the transcript.");
    if (
      task.due_date !== "Not specified" &&
      !transcript.toLowerCase().includes(task.due_date.toLowerCase())
    )
      throw new Error("AI deadline is not mentioned in the transcript.");
    if (task.assigned_to === "Unassigned") {
      if (task.assigned_email !== null)
        throw new Error("Unassigned tasks must have a null email.");
      continue;
    }
    const matching = aliases.filter(
      (alias) =>
        alias.name === task.assigned_to && alias.email === task.assigned_email,
    );
    const proved = matching.some(({ alias }) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        `(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`,
        "iu",
      ).test(task.transcript_quote);
    });
    if (!proved)
      throw new Error(
        "AI owner/email has no unambiguous attendee identity in its quoted evidence.",
      );
  }
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
