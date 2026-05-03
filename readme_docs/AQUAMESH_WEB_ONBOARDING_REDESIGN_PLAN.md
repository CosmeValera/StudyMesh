# AquaMesh Web Onboarding Redesign Plan

## Goal

Make AquaMesh feel like a webpage-first product instead of a desktop-style tool that drops users directly into an empty workspace.

The first screen should explain the basic workflow for an operations team:

1. Create a reusable widget.
2. Add visual building blocks.
3. Save the widget.
4. Add it to a dashboard for orders, delayed tasks, support tickets, system status, and team handoff.

## Product Direction

The default route should be a tutorial-style landing page. The builder workspace should live behind a dedicated workspace route.

- `/` shows the onboarding/tutorial page.
- `/workspace` shows the dashboard builder.
- `/login` keeps role selection for demo and permission tests.
- The `[Logo] AquaMesh` brand in the workspace links back to `/`.

This makes the product easier to understand before the user sees tabs, drag handles, dashboard menus, or saved libraries.

## Landing Page Structure

### Hero

Headline:

`AquaMesh`

Value proposition:

`Create operational dashboard widgets without code.`

Body:

`Build reusable widgets for orders, delayed tasks, support tickets, system status, team notes, and handoff actions, then place them into dashboards.`

Primary actions:

- `Create Daily Operations widget`
- `Open operations example`
- `Enter workspace`

The hero should include an actual product screenshot, preferably the widget editor or a finished Daily Operations dashboard.

### Workflow

Section title:

`Build one widget, then reuse it`

Steps:

1. `Create Widget`: name a Daily Operations widget and start from visual building blocks.
2. `Add Blocks`: drag in text, inputs, buttons, charts, and layout sections.
3. `Preview And Save`: check the widget, save it to the library, and keep versions.
4. `Add To Dashboard`: place the saved widget into the dashboard canvas.

### Use Cases

Section title:

`Made for daily operations`

Use case cards:

- `Orders today`: track intake, fulfillment, and handoff status.
- `Delayed tasks`: surface blocked work before it misses the day.
- `Support tickets`: show ticket mix, priority, and follow-up notes.
- `System status`: keep health indicators visible beside team actions.
- `Team handoff`: capture notes and next actions in the same view.

### Quick Answers

Move the useful FAQ content out of a workspace modal and into the landing page:

- `What should I do first?`
- `Which blocks should I start with?`
- `Where does my saved widget go?`

## Workspace Changes

The workspace should be simpler than the old desktop-like shell.

- Keep top navigation focused on `Dashboards`, `Add Widget`, `Create Widget`, and the user menu.
- Remove separate `Tutorial` and `FAQ` buttons from the workspace.
- Make the logo clickable and send users back to the landing/tutorial page.
- Keep the blank dashboard state focused on the same operational workflow:
  - Primary: `Create Daily Operations widget`
  - Secondary: `View Daily Operations example`
  - Secondary: `Add saved widget`
  - Link: `Open quick guide`

## Implementation Notes

- Use a shared workspace action helper for landing CTAs, top-nav buttons, and blank dashboard actions.
- Avoid DOM-click shortcuts for internal actions.
- Preserve custom widget `customProps` when adding FlexLayout tabs so saved widgets render with their components.
- Keep localStorage storage keys unchanged for compatibility with existing demo data.

## Acceptance Criteria

- Visiting `/` shows the tutorial landing page, not the dashboard workspace.
- Clicking `Create Daily Operations widget` opens `/workspace` with the widget editor.
- Clicking `Open operations example` opens `/workspace` with the Daily Operations dashboard.
- Clicking the AquaMesh logo from the workspace returns to `/`.
- The workspace top bar no longer contains separate Tutorial or FAQ buttons.
- Adding a saved/custom widget to a blank dashboard still creates visible dashboard content.
- Existing unit and e2e tests are updated for `/workspace`.
