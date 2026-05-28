## Summary

- Rebased the StudyMesh UI polish pass onto the latest `origin/main`.
- Added shared UI tokens and app-wide polish for MUI, PrimeReact, FlexLayout, panels, tabs, dialogs, inputs, buttons, cards, scrollbars, and focus states.
- Polished workspace shell/canvas, top navbar, dashboard tabs, empty dashboard state, Ask Sources chat, Study Path navigator, responsive dashboard editor panels, mobile widget cards, and widget editor palette/canvas surfaces.

## Notes

- Resolved the latest `main` empty-dashboard changes by keeping the newer product flow and applying the polish tokens/style language on top.
- No AI generation logic, providers, prompts, storage contracts, or dashboard data structures changed.

## Verification

- `npm --workspace studymesh run build`
