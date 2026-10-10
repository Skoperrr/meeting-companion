# Interactive Kanban

TaskBoard preserves its assignee, priority and status filters and renders KanbanBoard with the filtered task list. KanbanBoard provides the five status columns, visible-task completion metrics and an animated gradient progress meter. KanbanCard uses a dedicated keyboard-accessible grip handle so links, dropdowns, evidence controls and deletion buttons remain independently interactive.

Cross-column drops immediately update local status and PATCH the existing task endpoint. API errors restore the previous card layout and show an error toast. Deletion continues to use the existing confirmation and DELETE endpoint. One mutation is accepted at a time to keep rollback deterministic; drag and status controls are locked while a request is saving. Server refreshes preserve local ordering and optimistic changes until the server acknowledges them. Same-column reorder is local to the current board session: no database rank column is introduced, and a full reload can restore server ordering. Status changes persist across reloads.

The DND context is mounted only after hydration using useSyncExternalStore's server snapshot; server and initial client markup show matching skeletons. A scaled inner card preserves the library's drag positioning transform. Droppable placeholders are retained and active columns have a translucent highlight. Task cards keep their overdue badges, Google Calendar link, deletion confirmation and exact source evidence in a side drawer.

Confetti is loaded lazily on entering Completed from another status. Reduced-motion preferences disable it; progress and hover animations also respect reduced motion. Confetti never blocks a mutation or reports persistence success.

No SQL migration is required for this change. Existing deletion controls require migration 004 from the preceding feature. Dependencies and the pnpm lockfile include @hello-pangea/dnd, canvas-confetti and @types/canvas-confetti.

Automated state tests cover cross-column movement, same-column order, refresh reconciliation, duplicate prevention and unacknowledged mutations. Type checking, focused linting and a production Next.js build validate package integration. Live authenticated drag/drop and network-failure interactions still need a browser acceptance test after deployment.
