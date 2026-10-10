import test from "node:test";
import assert from "node:assert/strict";
import {
  meetSyncSchema,
  speakerAliases,
  uniqueAttendees,
  validateWorkspaceEvidence,
  type WorkspaceAnalysis,
} from "../lib/workspace-types.ts";
import { buildMeetingRecapEmail } from "../lib/meeting-email-template.ts";
const attendees = [
  { name: "Elena Adams", email: "elena@example.com" },
  { name: "Maya Singh", email: "maya@example.com" },
];
const transcript = "Elena (10:02 AM): I will prepare the prototype by Friday.";
const analysis: WorkspaceAnalysis = {
  summary: "Prototype discussion",
  key_points: [],
  decisions: [],
  follow_ups: [],
  proposed_tasks: [
    {
      title: "Prepare prototype",
      description: "Prepare prototype",
      assigned_to: "Elena Adams",
      assigned_email: "elena@example.com",
      due_date: "by Friday",
      priority: "High",
      transcript_quote: transcript,
    },
  ],
};
test("unique speaker tags map to canonical attendee identity", () => {
  validateWorkspaceEvidence(analysis, transcript, attendees);
  assert.equal(
    speakerAliases(attendees).find((a) => a.alias === "Elena")?.name,
    "Elena Adams",
  );
});
test("ambiguous first names, fabricated owners and emails are rejected", () => {
  assert.throws(() =>
    validateWorkspaceEvidence(analysis, transcript, [
      ...attendees,
      { name: "Elena Jones", email: "other@example.com" },
    ]),
  );
  assert.throws(() =>
    validateWorkspaceEvidence(
      {
        ...analysis,
        proposed_tasks: [
          {
            ...analysis.proposed_tasks[0],
            assigned_email: "other@example.com",
          },
        ],
      },
      transcript,
      attendees,
    ),
  );
  assert.throws(() =>
    validateWorkspaceEvidence(
      {
        ...analysis,
        proposed_tasks: [
          { ...analysis.proposed_tasks[0], assigned_to: "Unassigned" },
        ],
      },
      transcript,
      attendees,
    ),
  );
});
test("evidence and deadlines must exist verbatim", () => {
  assert.throws(() =>
    validateWorkspaceEvidence(
      {
        ...analysis,
        proposed_tasks: [
          { ...analysis.proposed_tasks[0], transcript_quote: "I promise" },
        ],
      },
      transcript,
      attendees,
    ),
  );
  assert.throws(() =>
    validateWorkspaceEvidence(
      {
        ...analysis,
        proposed_tasks: [{ ...analysis.proposed_tasks[0], due_date: "Monday" }],
      },
      transcript,
      attendees,
    ),
  );
});
test("recipient deduplication and exclusive request inputs", () => {
  assert.equal(
    uniqueAttendees([...attendees, { name: null, email: "ELENA@example.com" }])
      .length,
    2,
  );
  assert.equal(
    meetSyncSchema.parse({ calendarEventId: "event" }).calendarId,
    "primary",
  );
  assert.equal(meetSyncSchema.safeParse({}).success, false);
  assert.equal(
    meetSyncSchema.safeParse({
      calendarEventId: "event",
      meetUrl: "https://meet.google.com/abc-defg-hij",
    }).success,
    false,
  );
});
test("recap escapes HTML and preserves the human review boundary", () => {
  const payload = buildMeetingRecapEmail(
    {
      dispatchId: "dispatch",
      title: "Review\r\n<script>alert(1)</script>",
      meetingDate: "2026-10-09",
      documentUrl: "https://drive.google.com/file/d/test/view",
      analysis: { ...analysis, summary: "<img src=x onerror=alert(1)>" },
    },
    "Companion <recap@example.com>",
  );
  assert.ok(!payload.html.includes("<script>"));
  assert.ok(payload.html.includes("&lt;img"));
  assert.ok(payload.html.includes("AWAITING HUMAN REVIEW"));
  assert.ok(payload.text.includes(transcript));
  assert.ok(!/[\r\n]/.test(payload.subject));
  assert.throws(() =>
    buildMeetingRecapEmail(
      {
        dispatchId: "dispatch",
        title: "Review",
        meetingDate: "2026-10-09",
        documentUrl: "https://evil.example.com",
        analysis,
      },
      "recap@example.com",
    ),
  );
});
