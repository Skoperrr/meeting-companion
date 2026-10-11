# Monochrome motion system

Tailwind v4 loads tailwind.config.ts through @config in app/globals.css. The configuration supplies canvas, surface-base/elevated, border-subtle/focus, text-primary/secondary/tertiary, editorial serif and geometric sans families, and bg-ambient-glow. CSS @theme also exposes these tokens and maps previous botanical utility names to monochrome values so existing feature components remain compatible.

Instrument Serif and Inter load with display=swap and Georgia/Arial fallbacks. Public landing, Workspace, form, review, board, dialogs and command palette use obsidian/charcoal surfaces and white/gray accents. Google sign-in and completion confetti are monochrome. Avatar hashing varies grayscale lightness with readable dark initials.

lib/motion.ts provides fluidEase, springPhysics, fadeUp and staggerContainer. Task cards and board columns use the heavier spring. Shared card layout IDs exclude visual exit copies. DND remains responsible for pointer and keyboard transforms; projection pauses during active dragging. Card quote accordions animate measured auto height with fluidEase, and reduced motion removes their duration. Quick Peek remains available with Space and the evidence control.

DashboardHeader displays actual completion percentage and counts; it does not invent a completion streak without historical completion events. The profile menu exposes the existing email/sign-out control. MeetingSyncCard sits beside ingestion on larger screens and above it on mobile; its visualizer reflects the actual checking/processing/error state rather than pretending to stream backend progress.

The board displays To Do, In Progress, Blocked and Completed. Existing In Review records remain visible within In Progress; the status selector still exposes In Review. No database statuses are deleted or migrated. Assignee grouping, optimistic edits, calendar links, deletion, draft recovery, URL filters, virtualization, OAuth and Google Meet sync remain connected.

Validation: 50 tests, TypeScript, focused lint and production build passed. Signed-in browser visual/motion/DND checks remain manual acceptance work. No SQL, environment or dependency changes are needed.
