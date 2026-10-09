# Landing page, calendar links and duplicate reprocessing

## Source files

- `app/page.tsx`: responsive dark landing page, workflow preview, feature grid and Google/Dashboard navigation based on verified session identity.
- `components/TaskCalendarButton.tsx` and `lib/calendar.ts`: encoded Google Calendar links with evidence and deterministic date parsing.
- `components/TranscriptInput.tsx` and `components/DuplicateMeetingModal.tsx`: duplicate check, accessible native confirmation dialog, frozen confirmation payload and retry-safe processing.
- `app/api/meetings/check-duplicate/route.ts`: owner-scoped exact-title/transcript check.
- `app/api/process-transcript/route.ts`: validates explicit update consent, ownership and expected revision before AI processing and saving.
- `app/api/meetings/[id]/approve/route.ts` and `components/TaskReviewList.tsx`: version-aware approval.
- `lib/db.ts`, `lib/schemas.ts`: typed request contracts and Supabase RPC integration.
- `sql/002_duplicate_reprocessing.sql`: migration for an existing authenticated database.
- `sql/schema.sql`: complete schema for a fresh database, including both migrations.
- `tests/calendar.test.ts` and `tests/sql-security.mjs`: date/URL checks and PostgreSQL ownership, duplicate, reconciliation and migration checks.

## Deployment

For an existing installation that already ran `sql/001_google_auth.sql`, run **only** `sql/002_duplicate_reprocessing.sql` once in Supabase SQL Editor before deploying this upgrade.

If you have not applied the authentication migration yet, run `sql/001_google_auth.sql` first, followed by `sql/002_duplicate_reprocessing.sql`. For an empty database, run `sql/schema.sql` instead of either migration.

The migration is additive for the currently deployed authentication app: direct inserts gain an owner-scoped duplicate guard, and the previous two-argument approval RPC continues to work for version-one meetings. Once a meeting has been reprocessed, older review clients must reload and use the version-aware API.

Keep your existing public Supabase configuration and Gemini server key. Google Calendar links require no Calendar API credentials or extra OAuth scopes; users review and save the event on Google Calendar themselves.

## Duplicate semantics

Meeting titles are trimmed by the existing ingestion contract, then compared exactly and case-sensitively. Transcript comparisons are exact, including whitespace. A hash index accelerates comparisons; the full transcript is also checked so hash collisions cannot cause false matches. Only records owned by the authenticated user participate.

A transcript match takes precedence over a title-only match. When historical duplicate records already exist, the most recently created matching record is selected deterministically. This upgrade does not merge historical duplicates automatically.

Cancel makes no AI request and changes no records. Continue & Update reuses the meeting ID, writes a new immutable source revision and stages a new analysis for human review. Existing tasks stay active while the new revision is pending. A failed extraction leaves all saved data unchanged.

Approval is transactional. Exact transcript quotes identify existing commitments; each old task can match at most one approved proposal. Matching tasks keep their ID and status, while reviewed fields are updated. New approved commitments get new tasks. Unmatched prior tasks are archived, retain their source revision and are omitted from active boards/metrics. No task is left without its source meeting/revision. Approving zero proposals archives all prior active tasks for that meeting.

Quote matching deliberately avoids fuzzy AI similarity. If a revised transcript changes a task's quote, the old task is archived and the new approved task starts at To Do. Original evidence remains in meeting_revisions. Historical revisions/archived tasks can be inspected by their owner through Supabase RLS; this release does not add an archive-history browser.

Server-side per-owner transaction locks prevent concurrent duplicate inserts. Version checks prevent stale reprocessing or stale approval. Identical retries reuse the last processed request; conflicting retries return HTTP 409. The server repeats the duplicate check even when a caller bypasses the form.

## Calendar semantics

- Empty, Not specified and Unassigned deadlines produce no calendar button.
- ISO dates and English named-month dates become all-day events; the end date is exclusive.
- ISO datetimes with an explicit timezone become UTC events with a one-hour duration.
- A date/time without a timezone becomes an all-day event on that date, avoiding an invented timezone.
- Today, tomorrow, in N days, next week and weekdays resolve from the source meeting date. Next Friday advances seven days when the meeting was on Friday; otherwise it chooses the next upcoming Friday.
- Unresolved phrases and invalid dates suggest the current day plus three days. The task shows Suggested date and the event description tells the user to review the date.
- Links preserve the task description, owner, original deadline and verbatim quote using URLSearchParams encoding. Opens use noopener noreferrer.

Calendar URLs are event templates, not synchronization. Saving or editing an event in Calendar does not update the task board.

## Validation

Run `pnpm typecheck`, `pnpm test`, and `pnpm build:next`. Tests use PGlite's PostgreSQL engine and mock the auth identity/roles locally; live Google sign-in still depends on the configured Supabase provider.
