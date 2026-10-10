# StrideShift — AI Meeting Companion

A Next.js App Router application with Google sign-in, per-user Supabase storage, human approval and verbatim evidence. Uses TypeScript, Tailwind, Lucide and Google GenAI. See [Google OAuth setup and migration](docs-google-auth.md) for configuration and complete file descriptions.

See [landing, Calendar links and duplicate reprocessing](docs-landing-calendar-duplicates.md) for the latest upgrade and its database migration.

## File structure

```text
app/
  page.tsx, layout.tsx, globals.css
  api/process-transcript/route.ts
  api/meetings/route.ts
  api/meetings/[id]/approve/route.ts
  api/tasks/[id]/route.ts
components/
  TranscriptInput.tsx
  TaskReviewList.tsx
  TaskBoard.tsx
  QuoteModal.tsx
lib/
  schemas.ts, ai.ts, db.ts, http.ts, sample.ts
sql/schema.sql                 PostgreSQL schema + atomic approval + RLS
 db/schema.ts                  Hosted SQLite schema
 drizzle/                      Generated SQLite migrations
 test-data/meeting.txt
 test-data/expected.json
 tests/                        Integrity and persistence tests
 proxy.ts                      Supabase session refresh + protected routes
 next.config.ts
 .env.example
```

## Native Next.js + Supabase setup

1. Follow [Google OAuth setup](docs-google-auth.md) and configure the public Supabase URL/publishable key plus the server-only Gemini key.
2. For an existing database, apply `sql/001_google_auth.sql` if needed, then `sql/002_duplicate_reprocessing.sql`. For a fresh database, run `sql/schema.sql` instead of the migrations.
3. Install with `pnpm install --frozen-lockfile`.
4. Develop with `pnpm dev:next`. Production uses `pnpm build:next` and `pnpm start:next`.
5. Sign in with Google. Existing unowned records require explicit administrative assignment before appearing.

## Walkthrough

- New meeting → Load test transcript → Run sample walkthrough.
- The sample uses the bundled expected JSON and real database storage, without calling AI. It is visibly labelled and accepted only for the exact sample transcript.
- Review summary, key points, decisions and follow-ups; edit proposed tasks, deselect or reject unwanted ones, inspect original quotes.
- Confirm & save commits only selected proposals. Saving zero tasks closes review without creating any tasks.
- Change a task status and refresh the browser to verify persistence. The board refreshes after successful writes.
- Click a source meeting for analysis, original transcript and linked tasks.
- Configure Gemini and paste/upload a custom transcript for real LLM extraction. There is no automatic fixture fallback for arbitrary input.

## API

Mutations require same-origin JSON requests; validation errors return 422, missing resources 404, service failures 503. Inputs remain in the UI on failure.

- `POST /api/process-transcript`: `{title, meeting_date:"YYYY-MM-DD", transcript, demo:false, request_id:UUID}`. Returns the stored meeting with analysis and pending review. Reuse request_id on retry to avoid duplicate records. Reusing an ID with different content returns 409.
- `GET /api/meetings`: `{meetings, tasks, ai_configured}`; no-store.
- `POST /api/meetings/:id/approve`: `{tasks:[{proposal_index,title,description,assigned_to,due_date,priority,transcript_quote}]}`. Indices and quotes must match stored proposals. Approval is atomic and idempotent; concurrent approvals use the first transaction's selection.
- `PATCH /api/tasks/:id`: a nonempty subset of title, description, assigned_to, due_date, priority, status. Status: To Do, In Progress, Blocked, In Review, Completed. Source and evidence cannot be rewritten.
- `DELETE /api/tasks/:id`: deletes a task; returns 204. Rejection before approval is performed in staging.

## Extraction integrity

Gemini receives a required-field JSON schema with closed objects. Zod independently validates the result. Transcript contents are untrusted data. Quotes must be contiguous verbatim substrings; named owners and deadline phrases must occur in the transcript. Relative deadlines remain text. These checks cannot prove semantic correctness, so human approval is required. Reviewers can deliberately correct owners and dates; evidence stays immutable.

Missing owner: Unassigned. Missing deadline: Not specified. Default priority: Med. Decisions without actions and speculative follow-ups stay separate from tasks.

`test-data/meeting.txt` includes discussion and three actionable commitments: Maya owns the prototype due by Friday, Thabo owns upload validation without a deadline, and workflow documentation has no assigned owner. Retaining teal is a decision requiring no action. Calendar integration is a discussion follow-up. `expected.json` is the reference result; live wording may differ.

## Scope

Each Google-authenticated user has an isolated workspace enforced by verified server identity and PostgreSQL RLS. Database calls use the user session and publishable key. Transcript processing sends data to Google. Rate limits, AI usage quotas, pagination and retention controls remain future work.

Unsaved review edits are held in React state; refreshing restores original persisted proposals. Approved reviews cannot be reopened. The snapshot API loads all records; add pagination for larger datasets. Processing is synchronous with a 25-second timeout per AI attempt. Live Gemini and Supabase verification requires credentials.

## Checks

`pnpm typecheck`, `pnpm test`, `pnpm build:next`.

The PostgreSQL security test uses PGlite to check ownership isolation, approval rollback/idempotency, evidence protection and source ownership. The productivity tests check combined filters, Markdown task scoping and safe OAuth redirects. The legacy SQLite persistence test exercises atomic approval, duplicate prevention, selective saves, rollback and status persistence against SQLite. The integrity test rejects invented evidence, names and dates. The sample walkthrough verifies the product flow without requiring an AI key.

## Google Meet synchronization

The optional Workspace integration imports an existing Google Meet transcript, extracts speaker-aware proposals and emails an evidence-backed recap to the Calendar invitees. See [docs-google-meet-sync.md](docs-google-meet-sync.md) for OAuth configuration, encrypted per-user tokens, migration 003, the sync endpoint and retry semantics. Proposals still require human approval before becoming tracker tasks.
