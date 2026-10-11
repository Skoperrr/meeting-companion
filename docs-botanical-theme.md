# Botanical interface

Tailwind v4 design tokens live in app/globals.css under @theme. Reuse bg-botanical-paper, text-botanical-forest, border-botanical-border, text-botanical-sage, shadow-paper, font-serif and font-sans. Palette: paper #FAF8F5, forest #19241D, sage #4A5D4E, moss #3E5945, clay #C27D56 and warm borders #E5DFD7. Existing semantic utilities are remapped to organic palettes so review, quick peek, command palette and confirmation dialogs remain consistent.

Navbar is shared between the public landing page and Workspace header. Workspace retains its sidebar/mobile navigation, palette, sound toggle and sync modal. The landing page retains server-side session detection, Google OAuth and dashboard links, with a new editorial hero, rounded paper preview and calm feature/workflow sections. Existing Gloock and Wix Madefor Text font loading includes Georgia/Arial fallbacks.

TranscriptInput retains upload validation, duplicate confirmation, processing state and demo mode. TaskCard retains calendar links, status updates, deletion, evidence and source navigation; it adds a truncated evidence preview opening the existing drawer. Kanban retains status/assignee grouping, drag-and-drop, rollback, local reordering and completion feedback. Pastel avatars retain deterministic hashing and full assignee labels; dark initials meet normal-text contrast across the generated colors. No backend, OAuth scope, database, or dependency changes are required.

Typography, focus rings, native modal behavior and reduced motion support are preserved. Muted priority badges continue to include text labels rather than communicating meaning through color alone.

Validation: 46 TypeScript tests, TypeScript and focused ESLint checks, production build. Manual visual verification in a signed-in browser is still required; no live OAuth, sync, or email actions were triggered.
