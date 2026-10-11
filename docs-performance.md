# Motion and performance

useOptimisticMutation performs immutable immediate updates, captures the pre-write snapshot, serializes mutations and rolls back atomically on failure with an error toast. Kanban status, assignment, date and deletion all use it. Serialization avoids a failed older operation rolling back a newer one. Reads/refresh reconciliation retain existing acknowledgement overlays.

Framer Motion applies a stiffness 350/damping 25 spring to layout changes. Layout projection pauses during active DND; hello-pangea owns pointer transforms and keyboard drag physics. Removed/moved cards have a fixed-position, aria-hidden, non-interactive visual copy fading to opacity 0/scale .95, preventing duplicate draggable IDs. Reduced-motion users skip that copy and layout animation. TaskCard is memoized.

VirtualTaskList uses TanStack Virtual with measured variable heights, stable IDs and five-row overscan. History uses this list. The board adds a compact task-list view using the same virtualizer; the draggable Kanban stays fully mounted because its DND library requires those cards during dragging. React Compiler memoization is deliberately disabled for the virtualizer's mutable measurement API. Keep this list outside DND contexts.

Meeting hover/focus warms /meetings in the Next router and GET /api/meetings/[id] in a bounded 30-second client cache. The authenticated endpoint checks user ownership and is private/no-store. Concurrent hover requests are deduplicated; failures are silent. openMeeting uses a cached version when at least as recent as the Workspace snapshot; it can always show the existing local snapshot immediately. Refresh clears the cache. Prefetch is an optimization, not a guarantee of zero network latency.

Installed framer-motion and @tanstack/react-virtual; updated pnpm lockfile. No database migration or environment changes. Validation: 50 TypeScript tests, TypeScript, focused lint, frozen lockfile install and production build. Browser frame-rate measurements, dynamic list resize and pointer/keyboard DND acceptance remain manual checks; no live benchmark is claimed.
