# Google Meet synchronization backend

## Architecture

An authenticated same-origin POST obtains the signed-in user's encrypted Google refresh token. Calendar identifies the event and invitees; Meet supplies the authoritative transcript document ID; Drive exports Google Docs as plain text or downloads text files. Gemini extracts canonical attendee names and emails with verbatim evidence. A Supabase transaction saves a pending-review meeting and checkpoints the analysis. Resend sends one recap envelope per invitee using a persisted payload and idempotency key. Approved tasks enter the tracker through the existing review flow.

This is an on-demand orchestration endpoint. It does not join calls, record audio, start transcription, or subscribe to meeting-ended events. Call it after a transcript becomes available. A scheduler or Workspace Events subscription can invoke the same workflow later.

## Install and migrate

Dependencies are included in package.json and pnpm-lock.yaml: googleapis and resend, alongside @google/genai, @supabase/ssr and @supabase/supabase-js.

For an existing database, apply sql/003_google_meet_sync.sql **after** sql/001_google_auth.sql and sql/002_duplicate_reprocessing.sql. The feature is stacked on the landing/calendar/duplicate branch. For a new database run sql/schema.sql once; it already includes all migrations. Do not run both the full schema and migrations against the same database.

The migration stores encrypted credentials and durable sync jobs in tables that authenticated browser clients cannot access. Integration RPCs are restricted to service_role. Meetings and tasks retain owner-scoped RLS. assigned_email is checked against the saved attendee directory during approval, and cleared when an owner is edited.

## Environment variables

Keep the existing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, GEMINI_API_KEY and optional GEMINI_MODEL.

Add the following server-side environment variables in Vercel and redeploy:

| Variable                    | Value                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| APP_URL                     | Canonical HTTPS application origin, without a path; localhost HTTP is allowed for local development |
| GOOGLE_CLIENT_ID            | Google Cloud OAuth Web application client ID                                                        |
| GOOGLE_CLIENT_SECRET        | Secret for that same client                                                                         |
| GOOGLE_TOKEN_ENCRYPTION_KEY | A 32-byte random key encoded as 64 hexadecimal characters                                           |
| SUPABASE_SERVICE_ROLE_KEY   | Supabase project's server-only service_role API key                                                 |
| RESEND_API_KEY              | Resend API key with email sending permission                                                        |
| RESEND_FROM_EMAIL           | An address on a verified Resend domain, optionally `Meeting Companion <recap@your-domain>`          |

Generate the encryption key locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never prefix these secrets with NEXT_PUBLIC_. Preserve the encryption key across deployments; replacing it requires reconnecting Google accounts. Google credentials are per user, not a shared environment refresh token.

## Google Cloud setup

1. Enable Google Calendar API, Google Drive API and Google Meet REST API in the client project.
2. Configure the OAuth consent screen and add test users if the app is in testing. Request `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/drive.readonly`, and `https://www.googleapis.com/auth/meetings.space.readonly`. Drive access may require Google verification for a public production app.
3. Add `https://YOUR_APP_ORIGIN/api/google-workspace/callback` as an authorized redirect URI for this Web application client. Use the actual APP_URL origin. This is separate from the Supabase Google-login callback.
4. Sign into the application, then navigate to `/api/google-workspace/connect`. Grant Calendar, Drive and Meet read permissions using the same Google account. The callback validates the Google identity against the Supabase user, encrypts the offline refresh token and redirects to the dashboard.
5. A same-origin authenticated DELETE to `/api/google-workspace/connect` removes the local stored credential. Google account settings can revoke the upstream grant.

Transcripts must already exist and be accessible to the connected account. The API prefers Meet's FILE_GENERATED transcript document reference. It also accepts explicit transcript attachments or a Drive file tagged with the event's calendarEventId. Filename similarity alone is insufficient evidence of association. Shared organizer-owned documents are fetched by verified ID even when absent from the user's own Meet Recordings folder. Invitee display names may be absent; identities without an unambiguous name remain Unassigned.

## Invoke from a signed-in client

```typescript
export async function syncMeeting(
  calendarEventId: string,
  calendarId = "primary",
) {
  const response = await fetch("/api/meetings/sync-meet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarEventId, calendarId }),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}

export async function syncMeetLink(meetUrl: string) {
  const response = await fetch("/api/meetings/sync-meet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetUrl }),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}
```

Provide exactly one Event ID or Meet URL. Event IDs are Calendar API IDs, not iCalUIDs. For recurring events use the occurrence ID. Meet-link lookup examines accessible calendars over the previous 30 days and chooses the latest completed matching event. Multiple overlapping Meet conference records are rejected as ambiguous.

Success returns meetingId, version, reviewState: pending and email: {status: accepted, count}. Cached retries return cached: true and the original dispatch result. Email acceptance does not prove inbox delivery; check Resend delivery events separately. Calendar attendees are invitees, not a verified attendance roster. Resource invitees are excluded; up to 100 unique email recipients are supported.

## Retry and consistency

A fingerprint of the owned Calendar/event/document/transcript identifies each run. Concurrent requests acquire a ten-minute lease. The saved analysis and recipients remain immutable for that run, even if the Calendar directory changes later. A changed transcript creates a new revision of the same Google event. A collision with a manually imported meeting is rejected rather than silently overwriting it.

Email failures leave the draft intact and return proposalsSaved: true, meetingId and email.status: retry_required. Retry the identical sync input promptly. The persisted sender, subject, HTML, text and recipient ordering are reused with the same Resend idempotency key. After 23 hours from first email attempt, automatic retries stop: reconcile the batch in Resend before making any manual resend. This avoids silently duplicating mail after the provider's 24-hour idempotency retention. A crash during a request may require waiting for its lease to expire.

Emails explicitly mark tasks as AI-generated proposals awaiting human review. Synchronization never commits AI proposals to persistent tracker tasks automatically. Review/edit/approve the saved meeting through the existing interface.

## Files

- lib/google-workspace.ts: Workspace SDK access, exact meeting association and transcript retrieval.
- lib/workspace-types.ts: strict input/output contracts, attendee aliases and evidence validation.
- lib/ai.ts: strict Gemini JSON response schema and speaker-aware extraction prompt.
- lib/google-token-crypto.ts: AES-256-GCM token/state encryption with identity-bound associated data.
- lib/google-integration-store.ts: private owned connection storage and durable job RPCs.
- lib/meeting-email-template.ts: escaped HTML and plain-text recap rendering.
- lib/email-service.ts: idempotent Resend batch dispatch.
- app/api/google-workspace/connect/route.ts and callback/route.ts: offline Google consent and verified code exchange.
- app/api/meetings/sync-meet/route.ts: authenticated orchestration and retry responses.
- sql/003_google_meet_sync.sql: credentials, jobs, Google event identifiers and approval email validation.

## Validation

Automated checks cover canonical names, ambiguous aliases, false emails, quote/deadline evidence, recipient deduplication, HTML escaping, request exclusivity, database privilege isolation, active leases, atomic draft saving, frozen-payload retries, completion caching and approval email validation. Existing ownership, duplicate/revision, tracker and calendar checks remain in place. Live Google consent, transcript retrieval, Gemini generation and Resend delivery require your configured accounts; no external emails are sent by tests.
