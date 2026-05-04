# AquaMesh Real Product Improvements Handoff

## Resume Instruction

Next Codex session: first read `readme_docs/AQUAMESH_REAL_PRODUCT_IMPROVEMENTS_PLAN.md`, then continue the implementation from this handoff.

The main remaining work is to finish the light theme conversion for dialogs, modals, popups, and menus that still use green/dark surfaces. The workspace shell and core editor are mostly converted, but many secondary surfaces still need visual cleanup.

## Completed So Far

### Documentation

- Added `readme_docs/AQUAMESH_REAL_PRODUCT_IMPROVEMENTS_PLAN.md`.
- This handoff file tracks progress and remaining work.

### Continuation Update - No Dashboard Empty State And Dialog Polish

Implemented in the follow-up session:

- Extracted the Daily Operations dashboard empty state in `apps/aquamesh/src/components/Dasboard/Dashboard.tsx`.
- Reused that empty state when `openDashboards.length === 0`, so closing every dashboard still shows the same Create Daily Operations widget / View example / Add saved widget actions.
- Added focused coverage in `apps/aquamesh/tests/unit/components/dashboard/Dashboard.test.tsx`.
- Converted the main `TutorialModal` cards and body away from dark/gradient surfaces to light paper/default backgrounds with dark text and teal accents.
- Fixed `TemplateSelectionDialog` template card description and favorite icon colors that were still styled for dark cards.

### Light Workspace Theme

Mostly completed for the main workspace shell:

- Updated MUI palette mirror in `apps/aquamesh/src/theme/palette.js`.
- Updated global CSS variables in `apps/aquamesh/src/variables.scss`.
- Updated FlexLayout workspace styling in `apps/aquamesh/src/components/Layout/layout.scss`.
- Updated dashboard tab styling in `apps/aquamesh/src/components/Dasboard/tabs.scss`.
- Updated PrimeReact theme surfaces in:
  - `style/themes/aquamesh-theme/_variables.scss`
  - `style/themes/aquamesh-theme/_layout.scss`
  - `style/themes/aquamesh-theme/variables/_data.scss`
  - `style/themes/aquamesh-theme/variables/_panel.scss`

Important color adjustment already made:

- `primary.main` was darkened to `#007C66` for readable teal text on light surfaces.
- `primary.light` remains the brighter teal accent.
- `foreground.contrastPrimary` and `foreground.contrastSecondary` were changed from white aliases to dark text aliases because many components use those tokens on the light shell.

### Widget Editor Modes

Implemented:

- Added `WidgetEditorViewMode = 'both' | 'edit' | 'preview'`.
- `useWidgetEditor` defaults to `both`.
- Toolbar now has a segmented control: `Both`, `Edit`, `Preview`.
- `Both` shows editor and live preview side-by-side on desktop.
- Mobile layout stacks the panes.
- Preview-only mode hides edit chrome/palette.
- Save remains available in editable modes.

Touched files include:

- `apps/aquamesh/src/components/WidgetEditor/WidgetEditor.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/core/EditorToolbar.tsx`
- `apps/aquamesh/src/components/WidgetEditor/hooks/useWidgetEditor.ts`
- `apps/aquamesh/src/components/WidgetEditor/types/types.ts`
- `apps/aquamesh/src/components/WidgetEditor/components/core/EditorCanvas.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/core/ComponentPalette.tsx`

### Live Custom Widget Refresh

Implemented:

- `WidgetStorage` owns and exports `WIDGET_STORAGE_UPDATED`.
- Storage update events now include detail with action/widget/widgetId/name where possible.
- `CustomWidget` subscribes to `widgetStorageUpdated`.
- `CustomWidget` prefers storage by `widgetId`, then storage by `name`, then prop fallback.
- Matching deletes clear live dashboard widgets instead of keeping stale content.
- `useTopNavBarWidgets` imports the event from `WidgetStorage`.

Touched files include:

- `apps/aquamesh/src/components/WidgetEditor/WidgetStorage.ts`
- `apps/aquamesh/src/components/WidgetEditor/CustomWidget.tsx`
- `apps/aquamesh/src/customHooks/useTopNavBarWidgets.ts`

### Admin-Only Public Login

Implemented:

- Viewer is no longer exposed in public login UI.
- Public login writes Admin user data and enters `/workspace`.
- `userOptions.viewer` remains exported for internal/test role coverage.

Touched files:

- `apps/aquamesh/src/components/auth/Login.tsx`
- `apps/aquamesh/tests/unit/components/auth/Login.test.tsx`

### Tests Added/Updated

Added or updated focused tests:

- `apps/aquamesh/tests/unit/components/auth/Login.test.tsx`
- `apps/aquamesh/tests/unit/components/WidgetEditor/EditorToolbar.test.tsx`
- `apps/aquamesh/tests/unit/components/WidgetEditor/CustomWidget.test.tsx`
- `apps/aquamesh/tests/unit/components/WidgetEditor/WidgetEditor.test.tsx` may have been added by the Pikachu worker; verify it is present and committed in the final tree.

## Verification Already Run

Passed:

```bash
npm --workspace aquamesh run test:unit
npm run build
git diff --check
```

Notes:

- Unit tests pass: 5 files, 35 tests.
- Build passes with existing warnings.
- Warnings include Sass legacy/deprecation warnings, outdated Browserslist, missing `.env.production`, asset size warnings, and existing MUI Fragment warnings in `TopNavBar` tests.

## Browser Visual Audit

The app was started with:

```bash
npm --workspace aquamesh run start -- --port 3000
```

Playwright scripts were run manually using `@playwright/test`.

Screenshots and JSON audits were saved under:

```text
tmp/playwright-audit/
```

Key screenshots:

- `tmp/playwright-audit/workspace-desktop-final.png`
- `tmp/playwright-audit/workspace-mobile.png`
- `tmp/playwright-audit/widget-editor-desktop-final.png`

Findings:

- `/workspace` desktop passed sampled contrast after token fixes.
- `/workspace` mobile passed sampled contrast.
- Widget editor is mostly readable, but the latest audit still showed low/borderline contrast in the onboarding area before the last small patches:
  - `Step 1`
  - onboarding starter buttons such as `Add tickets chart`
- After that, `ComponentPalette.tsx` and `EditorCanvas.tsx` were patched to use darker teal for those areas. Re-run Playwright audit to confirm.

## Most Important Remaining Work

### 1. Finish Green Dialog/Modal/Popup Conversion

User explicitly noted that plenty of modals, popups, etc. are still green instead of white.

Search starting points:

```bash
rg -n "color: 'white'|background.*#006B58|background.*#005A49|#006B58|#005A49|#003D31|foreground\\.contrast" apps/aquamesh/src/components -g "*.tsx"
```

Likely high-impact files:

- `apps/aquamesh/src/components/shared/DialogStyles.tsx`
- `apps/aquamesh/src/components/shared/DialogHeader.tsx`
- `apps/aquamesh/src/components/tutorial/TutorialModal.tsx`
- `apps/aquamesh/src/components/tutorial/FAQDialog.tsx`
- `apps/aquamesh/src/components/tutorial/WidgetEditorExplanationModal.tsx`
- `apps/aquamesh/src/components/tutorial/DashboardWidgetExplanationModal.tsx`
- `apps/aquamesh/src/components/Dasboard/DashboardLibrary.tsx`
- `apps/aquamesh/src/components/Dasboard/Dashboard.tsx`
- `apps/aquamesh/src/components/Dasboard/DashboardOptionsMenu.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/WidgetLibrary.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/TemplateSelectionDialog.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/ExportImportDialog.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/SettingsDialog.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/DeleteConfirmationDialog.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/ComponentSearchDialog.tsx`
- `apps/aquamesh/src/components/WidgetEditor/components/dialogs/WidgetVersioningDialog.tsx`

Guidance:

- Convert dialog bodies to `background.paper` or `background.default`.
- Convert dialog text to `text.primary` / `text.secondary`.
- Keep teal for headers, icons, selected state, focus rings, and primary actions.
- Avoid white text unless the background is dark teal or a contained primary button.
- Prefer updating shared dialog styles first so many dialogs change together.

### 2. Re-run Playwright Visual Audit

Re-run browser checks after modal/popup cleanup:

- `/workspace` desktop
- `/workspace` mobile
- Create Widget editor
- Open key modals:
  - Tutorial
  - FAQ
  - Dashboard library
  - Saved widgets / Widget library
  - Template selection
  - Settings
  - Export/import

Check:

- Text readable on every surface.
- No white text on white/light backgrounds.
- No green full-panel/modal backgrounds except intentional teal accents.
- Buttons fit and do not overlap.
- Split widget editor still shows `Both`, `Edit`, `Preview`.

### 3. Run Final Verification

After cleanup:

```bash
npm --workspace aquamesh run test:unit
npm run build
git diff --check
```

Run e2e if time permits:

```bash
npm --workspace aquamesh run test:e2e
```

## Operational Notes

- A dev server may still be running on port `3000` from this session. If needed, check and stop/restart it.
- Do not revert the current changes; they include work from multiple agents:
  - Luxray: theme shell
  - Ashe: login
  - Pikachu: widget editor/storage refresh
- The current user priority is visual polish for the light theme, especially remaining green modals/popups.
