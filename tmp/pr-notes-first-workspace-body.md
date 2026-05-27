Adds a notes-first path so StudyMesh feels less like an AI wrapper and more like a place to think/write first.

What changed:

- Empty dashboards now include a “Start with notes, not AI” Markdown scratchpad.
- Clicking “Open notes page” turns the draft into a temporary dashboard with one Markdown notes widget.
- The temporary notes dashboard is not added to saved dashboards/library; it only becomes durable if the user saves it through the existing dashboard save flow.
- Ask Sources gets a private notes lane so users can talk/write to themselves without invoking AI, then open that text as a notes dashboard.
- Notes dashboards reuse existing CustomWidget + MarkdownBlock structures, so they can be read by current dashboard/source context without new storage contracts.

Verification:

- `npx vitest --run --config ./vitest.config.ts tests/unit/components/dashboard/Dashboard.test.tsx tests/unit/dashboard/dashboardChatContext.test.ts` — 13 passed.
- `npm --workspace studymesh run build` — passed with existing Sass/asset warnings.
