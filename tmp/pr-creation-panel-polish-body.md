Polishes the new Creation panel flow and fixes Quick Create wiring.

What changed:

- Empty-dashboard Quick Create cards now route into Create from Material with the chosen output selected and an explicit “add material” message.
- Quick Create now lives in its own card instead of blending into the main Creation page.
- Create from Material header/copy is cleaner.
- Fixed the broken inline “Preparing… Working” job: Quick Create now opens the real existing Create from notes / Create Study Pack command with the selected resource and source prefilled.
- Create from Material’s final CTA also hands off to that existing creation command, so generation uses the old tested path instead of a fake inline job.
- Quick generations no longer create floating mini-markers.

Verification:

- `npx vitest --run --config ./vitest.config.ts tests/unit/components/workspace/WorkspaceStudioShell.test.tsx tests/unit/components/dashboard/Dashboard.test.tsx` — 18 passed.
- `npm --workspace studymesh run build` — passed with existing Sass/asset warnings.
