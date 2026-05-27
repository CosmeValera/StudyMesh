Bolder visual/layout pass after feedback that the first polish was too subtle.

What changed:

- Turns the workspace shell into a glowing command-center layout with aurora backgrounds and framed dashboard canvas.
- Makes Creation a launch deck instead of a small side panel: big command header, stats strip, louder Study Path hero, Quick Create runway, and Material Lab flow board.
- Makes empty dashboards feel like mission control with a huge hero, bigger Study Path action, larger material cards, and a visible 3-step launch strip.
- Makes Ask Sources feel like a source-intelligence panel with a larger header, stronger prompt hero, and grid suggestion cards.
- Adds a more cinematic top nav and mobile/desktop workspace framing.

Verification:

- `npx vitest --run --config ./vitest.config.ts tests/unit/components/workspace/WorkspaceStudioShell.test.tsx tests/unit/components/dashboard/Dashboard.test.tsx` — 18 passed.
- `npm --workspace studymesh run build` — passed with existing Sass/asset warnings.

Note: the broader `npm --workspace studymesh run test:unit -- ...` still runs the full suite because of the script shape and hit the pre-existing intermittent 5s timeout in `CreateStudyPathModal role enforcement > creates Local AI Study Path dashboards with visible source notes widgets`; targeted changed-file tests pass.
