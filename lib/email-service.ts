import "server-only";
import { Resend } from "resend";
import { ApiError } from "./http";
import { uniqueAttendees, type Attendee } from "./workspace-types";
import {
  buildMeetingRecapEmail,
  type RecapEmailData,
  type RecapEmailPayload,
} from "./meeting-email-template";
export function recapEmailPayload(data: RecapEmailData): RecapEmailPayload {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from || /[\r\n]/.test(from))
    throw new ApiError(503, "Set RESEND_FROM_EMAIL to a verified sender.");
  return buildMeetingRecapEmail(data, from);
}
export async function sendMeetingRecap(
  meetingData: RecapEmailData,
  attendees: Attendee[],
  frozenPayload?: RecapEmailPayload,
): Promise<string[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ApiError(503, "RESEND_API_KEY is not configured.");
  const recipients = uniqueAttendees(attendees);
  if (!recipients.length || recipients.length > 100)
    throw new ApiError(
      422,
      "Email dispatch requires 1–100 verified calendar invitees.",
    );
  const payload = frozenPayload ?? recapEmailPayload(meetingData);
  // One envelope per recipient: other invitees' addresses are not exposed in To/CC.
  const result = await new Resend(key).batch.send(
    recipients.map((attendee) => ({ ...payload, to: [attendee.email] })),
    { idempotencyKey: `meet-recap/${meetingData.dispatchId}` },
  );
  if (result.error || !result.data)
    throw new ApiError(
      502,
      "Resend did not accept the recap batch. The saved meeting can be retried.",
    );
  const ids = result.data.data.map((email) => email.id);
  if (ids.length !== recipients.length)
    throw new ApiError(
      502,
      "Resend returned an incomplete recap batch response.",
    );
  return ids;
}
