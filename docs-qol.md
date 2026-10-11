# Quality of life controls

SmartDateBadge uses chrono-node and date-fns. Spoken dates are anchored to meeting_date in the viewer's local calendar; countdowns refresh every minute. Explicit dates use ISO strings. A native date picker provides keyboard-friendly date adjustment, optimistic UI, persistent PATCH updates and rollback on failure. Changing a deadline is a human edit; the original transcript evidence remains intact.

useDraftRecovery stores title, transcript and meeting date after a 600ms debounce, scoped to the signed-in user's email. It restores only validated fields and clears after successful processing. Clear Draft also clears the form. Storage failures never block submission. Drafts are local to the browser; they are not uploaded until submission. Draft storage persists until cleared or successfully processed.

TaskBoard reads assignee, priority, status and q from URL parameters. Changes use App Router replace with scroll:false, preserving unrelated parameters and avoiding hard reloads. Next.js App Router does not accept a shallow option. Avatar filtering updates the same URL-backed state.

TranscriptViewer accepts highlightQuote or #quote=<URI-encoded exact excerpt>, locates the literal source substring and centers the marked passage. Source meeting buttons populate the hash, and meeting details mount the viewer in an open transcript section. Reduced motion disables highlight pulses and smooth scrolling.

BatchActionBar is connected to a separate selection checkbox on each staged review card. It approves, assigns to existing staged owners/Unassigned, or deletes selected proposals in local staging only. Saving still commits only approved tasks. Reassignment clears the extracted email. No persistent task is deleted by staging actions.

Meet sync accepts meet.google.com/abc-defg-hij without a scheme and prepends HTTPS. Full HTTPS URLs and Calendar event IDs still work; unsafe hosts and HTTP links remain rejected.

chrono-node is newly installed; date-fns was already present. pnpm-lock.yaml is updated. No SQL changes are needed. Validation: 48 TypeScript tests, focused lint, TypeScript and production build passed. Draft recovery, native picker, URL navigation and batch dock interactions require manual browser acceptance testing.
