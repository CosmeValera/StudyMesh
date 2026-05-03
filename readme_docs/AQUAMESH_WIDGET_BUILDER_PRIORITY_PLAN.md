# AquaMesh Widget Builder Priority Plan

## Goal

Make AquaMesh feel first and foremost like a no-code widget builder for dashboards.

The previous iteration made the app clearer as a no-code dashboard builder. This iteration sharpens the product around the most valuable workflow:

> Create your own dashboard widget visually, then reuse it inside dashboards.

The empty dashboard should still help users build a dashboard, but the main call to action must be the custom widget editor because that is the feature that makes AquaMesh more than a dashboard template gallery.

## Product Priority

### Primary Flow

1. Open AquaMesh.
2. See that the main thing to do is create a reusable dashboard widget.
3. Open `Create Widget`.
4. Follow a guided first-widget path.
5. Add basic building blocks.
6. Save the widget.
7. Add the saved widget to a dashboard.

### Secondary Flow

1. Open an example dashboard.
2. Understand what a finished dashboard can look like.
3. Use it as inspiration, not as the main product promise.

### Deprioritized Flow

Microfrontends, host/remotes, Module Federation, System Lens, and Control Flow should not be part of the product story anymore. They may remain in code if technically needed, but the public README, app onboarding, and demo path should focus on AquaMesh-owned widget/dashboard creation.

## Problems To Fix

### 1. Empty Dashboard CTA Priority

Current issue:

- `Create dashboard from template` is the primary button.
- `Build custom widget` is only an outlined secondary button.
- This points users toward whole-dashboard templates instead of the custom editor, even though the custom editor is the strongest feature.

Required change:

- Make `Build custom widget` or `Create Widget` the primary contained action.
- Place it first.
- Make dashboard templates a secondary action.
- The copy should say that creating custom widgets is the recommended first step.

Suggested empty-state hierarchy:

1. Primary button: `Create Daily Operations widget`
2. Secondary button: `View example dashboard`
3. Secondary button: `Add existing widget`
4. Text link: `Open quick guide`

### 2. Empty Dashboard Add Widget Bug

Current issue:

- Clicking `Add Widget` from the empty dashboard opens the widget menu.
- Clicking a widget from that menu does not visibly add anything to the empty dashboard.
- This makes the page feel broken.

Likely reason:

- The current `ensureDashboardAndAddComponent` behavior creates a new dashboard if there are no dashboards, but a blank dashboard already exists. It may not have an active FlexLayout tabset, so `addComponent` has nowhere useful to insert the widget.

Required change:

- If the selected dashboard is blank and the user picks a widget, the app should initialize a usable dashboard layout and add the widget.
- This must work from the empty dashboard state and from the normal top bar.

Acceptance criteria:

- On a blank dashboard, clicking `Add Widget` and selecting any ready-made widget creates visible dashboard content.
- The user does not need to manually create a layout first.
- The behavior matches what users expect from a dashboard builder.

### 3. Dashboard Templates Should Support The Story, Not Lead It

Current issue:

- `Create dashboard from template` sounds like the main product action.
- It competes with custom widget creation.

Required change:

- Rename or reframe it as `View example dashboard` or `Open operations example`.
- Make it visually secondary.
- Prefer the `Daily Operations Dashboard` story over generic dashboard examples.

Acceptance criteria:

- The Daily Operations Dashboard is presented as an example users can inspect.
- The page does not imply that selecting prebuilt dashboards is the main use case.

### 4. Tutorial Still Reads Like Documentation

Current issue:

- The tutorial explains concepts and menus.
- It does not feel like a guided product walkthrough.

Required change:

- Rewrite the tutorial as a short quick-start guide.
- The first slide should immediately send users toward creating a widget.
- Use action-oriented steps:
  1. `Create a widget`
  2. `Add building blocks`
  3. `Save it`
  4. `Use it in a dashboard`

Acceptance criteria:

- The tutorial is not a conceptual reference manual.
- It tells a user what to do next.
- `Create Widget` is presented as the main path.

### 5. Remove Microfrontend Story From Public Docs

Current issue:

- Microfrontend architecture distracts from the product.
- The user prefers the Daily Operations Dashboard story.

Required change:

- Remove Module Federation/microfrontend positioning from the public README and app README.
- Do not lead with System Lens or Control Flow.
- If architecture details remain, keep them minimal and product-supporting.

Recommended replacement:

- `AquaMesh stores widgets and dashboards locally for demo use.`
- `The app is built with React and TypeScript.`
- `The dashboard workspace supports reusable widgets, templates, import/export, and version history.`

Acceptance criteria:

- A recruiter or visitor reading the README sees a no-code product, not a microfrontend exercise.
- Daily Operations Dashboard becomes the concrete demo story.

### 6. First-Time Create Widget Experience

Current issue:

- The widget editor is powerful, but a first-time user still needs to infer how to create a useful widget.
- The empty canvas has improved copy, but it does not yet guide the user through the first widget.

Required change:

- Add a guided first-widget experience inside `Create Widget`.
- Prefer a lightweight in-editor guide over a heavy modal.
- The guide should be visible when the widget has no components.
- It should offer direct actions that add useful starter blocks.

Recommended design:

- A compact guide panel above or inside the empty canvas:
  - Title: `Build a Daily Operations widget`
  - Step 1: `Name it`
  - Step 2: `Add a chart, text, input, or button`
  - Step 3: `Preview and save`
- Primary starter actions:
  - `Start from Daily Operations`
  - `Add tickets chart`
  - `Add status text`
  - `Add team note`
  - `Browse templates`

Acceptance criteria:

- A user can open `Create Widget` and immediately understand the next action.
- A user can create a first widget without reading documentation.
- The guide disappears or becomes less prominent once components exist.

### 7. Suggested Implementation Order

1. Write this new plan and link it from the docs.
2. Update public READMEs to remove microfrontend emphasis.
3. Rework the empty dashboard CTA hierarchy.
4. Fix blank-dashboard widget insertion.
5. Rewrite tutorial into a quick-start flow.
6. Add guided first-widget UX in `Create Widget`.
7. Update tests for new labels and behavior.
8. Run build and unit tests.

## Success Criteria

A first-time visitor should understand this in under 20 seconds:

- AquaMesh is mainly for creating reusable dashboard widgets without code.
- The first recommended action is to create a widget.
- Example dashboards exist to show what is possible.
- Adding a widget from a blank dashboard works.
- The tutorial guides action instead of documenting menus.
