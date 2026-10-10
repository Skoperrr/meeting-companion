# Safe deletion and tracker polish

Apply `sql/004_safe_deletion.sql` once to an existing database after migrations 001–003. For a new database, run the complete `sql/schema.sql` once instead. Migration 004 grants owner-scoped meeting deletion and changes the saved sync-job meeting foreign key to ON DELETE CASCADE so copies of deleted transcripts and recaps do not remain in that table. Deleting a meeting does not unsend emails or delete the upstream Google Drive document or Calendar event.

`DELETE /api/tasks/[id]` and `DELETE /api/meetings/[id]` validate UUIDs, reject cross-origin writes and authenticate through the existing Supabase SSR helper. Queries filter both ID and authenticated owner; RLS provides a second boundary. Success returns 204, missing/inaccessible records return 404, and unauthenticated calls return 401.

TaskCard opens an accessible native confirmation dialog with focus initially on Cancel. TaskBoard removes a confirmed task optimistically, restores it if the API fails, refreshes the local workspace snapshot and calls router.refresh. Errors stay visible on the board. MeetingDetails and history cards provide a separate deletion control; successful deletion removes local meeting/tasks and navigates back to the dashboard. History controls are siblings of the navigation button, avoiding nested buttons.

Overdue badges compare resolved deadline days with the viewer's local calendar date. Relative deadlines use the original source meeting date. Completed tasks, missing dates and unresolvable/fallback dates are not highlighted. Due-today tasks remain normal. The text and evidence are preserved exactly. Client time is initialized after hydration and updates every minute.

TaskCardSkeleton is used by `app/(workspace)/tracker/loading.tsx`, the actual App Router path for `/tracker`. Empty board columns use a dotted border and “No tasks here”.

Validation covers deadline boundaries and unknown/relative dates, owner isolation and database deletion cascades for tasks, revisions and durable Google transcript copies. No production data is deleted during testing.
