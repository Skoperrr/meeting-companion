# Board polish

Space opens Quick Peek while the card surface is hovered or keyboard focused. Escape and backdrop clicks close the native modal, with focus restored. Buttons, inputs and the dedicated drag handle retain their normal Space behavior. The evidence button also opens Quick Peek. Reduced motion disables drawer entrance animation.

Group by Assignee retains visible owners and an Unassigned drop target. Dragging between owners sends assigned_to through the existing authenticated PATCH route; the server clears assigned_email. Status is unchanged. Failed requests roll back the optimistic move. The same serialization lock protects status, reassignment and deletion. Ordering within a column remains local; refresh preserves the mounted board order. Assignees are display names, not user account membership changes.

Meeting export scopes tasks to that meeting. Slack uses mrkdwn and emoji codes; rich email writes HTML and plain text representations to the clipboard. Browser permissions and secure context are required. Unsupported rich clipboard browsers get an explicit error rather than a false copied confirmation. CSV includes UTF-8 BOM, quoted cells, CRLF rows and formula-injection protection. Jira/Linear import field mapping is selected in the destination importer; relative deadlines stay unchanged for review.

The App Router SVG icon is a scalable, repo-native meeting/checkmark badge. No dependency, environment or SQL migration is needed.

This branch also includes the previous command palette/avatars/audio/review-animation changes because that PR had not yet merged when this work started. The draft PR targets main and supersedes PR #8.

Validation: 38 TypeScript tests; TypeScript check; focused ESLint; production webpack build. Browser clipboard paste into Gmail/Outlook, keyboard DND and pointer drawer interactions need manual acceptance testing.
