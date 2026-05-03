# AquaMesh Real Product Improvements Plan

## Goal

Make AquaMesh feel like a real operational dashboard product instead of a UI demo.

The product should read as:

> AquaMesh helps operations teams build, preview, save, and reuse internal dashboard widgets without writing code.

This plan keeps the existing no-code dashboard-builder story, but sharpens the app around a clearer audience: people who monitor queues, incidents, service status, daily work, and internal processes.

## Current Problem

AquaMesh already has the foundation of a useful product: a visual widget editor, saved widgets, dashboard layouts, templates, import/export, and local persistence. The experience still has a few demo-like edges:

- The workspace shell is dominated by green surfaces, which makes the app feel branded before it feels usable.
- The widget editor has an edit/preview toggle, but users cannot edit and preview side-by-side.
- Saved widgets added to a dashboard can become stale after the widget is edited elsewhere.
- The public login UI exposes Viewer as an equal choice, even though the demo is strongest when users can build immediately.
- First-run guidance exists, but operational users would benefit from more concrete scenarios, seeded examples, and page-level empty states.

## Product Direction

Primary audience:

- Operations teams building internal dashboards.
- Support and service teams monitoring queues and status.
- Non-programmers who need reusable dashboard widgets.
- Product or business users prototyping internal tools.

Product principles:

- The workspace should feel like a calm operational application: light surfaces, clear hierarchy, dark text, and teal accents.
- The main workflow should be visible and editable at the same time: drag components on the left, see the live result on the right.
- Dashboard widgets should behave like live product data, not copied snapshots that silently go stale.
- Public demo users should start with enough permissions to experience the builder.
- Empty states and onboarding should guide users toward realistic operational scenarios.

## Required Changes

### 1. Light Workspace Theme

Priority: High

Current issue:

- `apps/aquamesh/src/variables.scss`, `apps/aquamesh/src/components/Layout/layout.scss`, and the AquaMesh PrimeReact theme still contain dark green workspace surfaces.
- These colors make tabsets, panels, dialogs, and dashboard chrome feel heavy for a repeated-use operational app.

Required change:

- Replace the green workspace shell with a white and light-gray app theme.
- Keep teal as the primary brand/accent color for selected states, primary buttons, focus outlines, and key affordances.
- Use dark text on light surfaces throughout the workspace.

Implementation notes:

- Update MUI palette tokens in `apps/aquamesh/src/theme.ts`.
- Update CSS variables in `apps/aquamesh/src/variables.scss`.
- Update FlexLayout tab chrome in `apps/aquamesh/src/components/Layout/layout.scss`.
- Review PrimeReact SCSS variables in `style/themes/aquamesh-theme/_variables.scss` and related component variable files where dark green surfaces are hard-coded.
- Prefer neutral workspace values such as `#ffffff`, `#f7f9fa`, `#eef2f3`, and dark text such as `#172026` or the existing `#001026`.
- Keep teal values such as `#00C49A`, `#009879`, and `#007C66` for accents only.

Acceptance criteria:

- The main workspace background is light gray or white, not green.
- FlexLayout tab bars and tab content are light surfaces with readable dark text.
- Dialogs, panels, menus, and empty states do not rely on dark green backgrounds.
- Teal remains visible as the product accent but no longer dominates the shell.

### 2. Widget Editor View Modes

Priority: High

Current issue:

- `WidgetEditor` and `useWidgetEditor` expose a binary `editMode` state.
- Users must switch between editing and previewing instead of seeing both.
- The current toolbar uses a single edit/preview icon toggle, which hides the product value of live preview.

Required change:

- Introduce `WidgetEditorViewMode = 'both' | 'edit' | 'preview'`.
- Default the editor to `both`.
- In `both` mode, show the editing canvas and live preview side-by-side at 50/50 on desktop.
- On mobile, stack edit and preview vertically.
- Replace the current edit/preview icon toggle with a segmented control labeled `Both`, `Edit`, and `Preview`.

Implementation notes:

- Add the type in `apps/aquamesh/src/components/WidgetEditor/types/types.ts` or a nearby editor type module.
- Change `useWidgetEditor` to store `viewMode`, not only `editMode`.
- Derive editing behavior from `viewMode !== 'preview'`.
- Derive preview-only behavior from `viewMode === 'preview'`.
- Keep compatibility where existing flows pass `initialEditMode`; map `true` to `edit` or `both` depending on context, and `false` to `preview`.
- Update `EditorToolbar` to accept `viewMode` and `setViewMode`.
- Update `EditorCanvas` to receive a derived `editMode` boolean so existing component editing behavior can be migrated incrementally.
- Add a `WidgetPreviewPane` component, or reuse `CustomWidget` with unsaved `widgetData.components`, for the right-side preview.
- Preview rendering must always be read-only. Do not expose edit handles, drag targets, delete actions, or palette controls in the preview pane.

Acceptance criteria:

- Opening `Create Widget` shows editor and preview together by default.
- `Both` shows palette/edit canvas plus live preview.
- `Edit` hides the preview pane.
- `Preview` hides palette/edit chrome and renders the widget read-only.
- Save remains available when there are changes and the preview pane is visible.

### 3. Live Dashboard Widget Refresh

Priority: High

Current issue:

- Dashboard-rendered `CustomWidget` instances can use embedded `customProps.components` from the tab payload.
- After a saved widget is updated, an already-added dashboard widget may continue showing stale components until it is re-added or reloaded.

Required change:

- Make dashboard-rendered `CustomWidget` instances subscribe to `widgetStorageUpdated`.
- Reload by `widgetId` immediately after save, update, delete, or restore.
- Prefer live storage data over stale embedded tab data.

Implementation notes:

- Keep the existing event name `widgetStorageUpdated` for compatibility.
- Enhance storage events with optional detail:

```ts
type WidgetStorageUpdatedDetail = {
  widgetId?: string;
  action?: "save" | "update" | "delete" | "restore";
};
```

- Update `WidgetStorage.saveWidget`, `WidgetStorage.updateWidget`, delete flows, and restore/version flows to dispatch this detail when possible.
- Update `CustomWidget` load priority to:
  1. Live widget by `widgetId` from storage.
  2. Live widget by matching `name` from storage.
  3. Prop or `customProps.components` fallback.
- Preserve localStorage keys and existing saved widget shape.
- If a referenced widget is deleted, show an intentional unavailable state rather than silently rendering an old copy when a `widgetId` exists.

Acceptance criteria:

- A saved widget already on a dashboard updates immediately after the widget is saved from the editor.
- Updating a widget by ID wins over embedded dashboard tab components.
- Existing dashboard tabs that only have embedded components still render as a fallback.
- The widget library and top navigation continue to update from the same storage event.

### 4. Admin-Only Public Login

Priority: Medium

Current issue:

- `apps/aquamesh/src/components/auth/Login.tsx` exposes Viewer in the public role selector.
- The demo experience is weaker when a new visitor enters read-only mode and cannot use the builder.

Required change:

- Remove Viewer from the public login UI, or show it as disabled with clear copy that the demo starts in Builder/Admin mode.
- Keep underlying Viewer role support in auth and permission code if tests still need read-only coverage.
- Public demo login should enter as Builder/Admin.

Implementation notes:

- Keep `VIEWER_ROLE` fixtures available for unit tests and internal permission checks.
- Update login helper text to describe Admin/Builder as the default demo path.
- Remove copy that tells users to select Admin for full access after they have already selected Viewer.

Acceptance criteria:

- The login form no longer lets a public user choose Viewer as the primary path.
- The default role has access to `Create Widget`, dashboard editing, templates, and saved widgets.
- Existing permission tests can still construct Viewer users directly where read-only coverage is useful.

## Additional Onboarding And Product Ideas

### 1. Workspace Onboarding Checklist

Add a compact checklist inside `/workspace` that tracks the first useful actions:

- Create a widget.
- Add a component.
- Preview the widget.
- Save the widget.
- Add it to a dashboard.

The checklist should be dismissible and should not block the workspace.

### 2. One-Click Scenario Templates

Add scenario templates that create a practical starting point:

- `Operations`: service health, incident count, maintenance toggle, operator note.
- `Support Queue`: open tickets, priority split, response status, escalation action.
- `System Status`: uptime, dependency status, alerts, release note.

Templates should feel like examples users can adapt, not a separate product mode.

### 3. Save And Add To Dashboard CTA

After a widget is saved, show a post-save action:

- Primary: `Add to dashboard`.
- Secondary: `Keep editing`.
- Optional: `Create another widget`.

This closes the gap between widget creation and dashboard usage.

### 4. Seeded First-Run Demo Data

Seed sample widgets and dashboards for first-run demos when localStorage is empty:

- Daily Operations widget.
- Support Queue widget.
- System Status widget.
- One example dashboard using those widgets.

Seeded data should be marked as sample/demo data so users can safely replace it.

### 5. Contextual Empty States

Replace generic help modals with page-specific empty states:

- Empty dashboard: prompt users to create or add a widget.
- Empty saved widgets: prompt users to build their first widget.
- Empty template list: explain scenario templates.
- Empty widget editor canvas: offer starter blocks.

Each empty state should provide one primary action and one secondary action.

## Interfaces And Data Flow

### Widget Editor

Add a view-mode type:

```ts
export type WidgetEditorViewMode = "both" | "edit" | "preview";
```

Expected state flow:

- `useWidgetEditor` owns `viewMode`.
- `EditorToolbar` changes `viewMode`.
- `WidgetEditor` derives `canEdit = viewMode !== 'preview'`.
- `EditorCanvas` receives `editMode={canEdit}`.
- `WidgetPreviewPane` receives current unsaved `widgetData.components`.
- `CustomWidget` remains the renderer for saved dashboard widgets and can also render preview components when passed direct component data.

### Storage Events

Keep the existing event:

```ts
document.dispatchEvent(
  new CustomEvent(WIDGET_STORAGE_UPDATED, {
    detail: { widgetId, action },
  }),
);
```

Consumers should tolerate missing `detail` because existing code dispatches the event without payload.

### Dashboard Widget Resolution

`CustomWidget` should resolve components in this order:

1. If `widgetId` or `customProps.widgetId` exists, load from `WidgetStorage.getWidgetById`.
2. If no ID resolves and `name` exists, find the latest widget with that name.
3. If no live widget resolves, use `components` or `customProps.components`.
4. If a live widget ID was requested but deleted, show an unavailable widget state.

## Suggested Implementation Order

1. Add this plan to `readme_docs`.
2. Update light theme tokens and FlexLayout/PrimeReact shell styling.
3. Add `WidgetEditorViewMode` and toolbar segmented control.
4. Add split editor/preview layout and read-only preview pane.
5. Enhance `WidgetStorage` events and `CustomWidget` live reload.
6. Remove or disable Viewer from public login.
7. Add or update focused unit tests.
8. Add or update Playwright coverage for the main workflows.
9. Run unit tests, e2e tests, and production build.

## Test Plan

Unit tests:

- `EditorToolbar` renders `Both`, `Edit`, and `Preview`.
- Toolbar mode selection calls the mode setter with the expected value.
- `WidgetEditor` defaults to `both`.
- Save remains possible when changes exist and the preview pane is visible.
- `CustomWidget` reloads live storage data when `widgetStorageUpdated` fires.
- `Login` shows Viewer disabled or absent from the public role selector.

E2E tests:

- Workspace uses light theme surfaces instead of green workspace backgrounds.
- Widget editor opens in split edit/preview mode.
- Switching to `Edit` hides preview.
- Switching to `Preview` hides palette and edit chrome.
- Updating a saved widget refreshes an already-added dashboard widget without clicking it.
- Public login path only allows Admin/Builder.

Commands:

```bash
npm --workspace aquamesh run test:unit
npm --workspace aquamesh run test:e2e
npm run build
```

## Success Criteria

A first-time visitor should understand this in under 30 seconds:

- AquaMesh is for building operational dashboards and reusable widgets.
- The workspace is a usable light app, not a themed demo shell.
- Widget editing has a live preview by default.
- Saved widgets on dashboards update when the source widget changes.
- The public demo starts with builder permissions.
- Example scenarios show practical operations, support, and system-status use cases.

## Assumptions

- "White instead of green" means light workspace surfaces with teal accents, not removing the AquaMesh brand color.
- Viewer remains supported internally for permission coverage, but it is not a public demo path.
- LocalStorage keys should remain unchanged to avoid breaking existing saved dashboards and widgets.
- The five additional onboarding ideas above stand in for a product-audit substitute and can be replaced or expanded if an external audit response is supplied later.
