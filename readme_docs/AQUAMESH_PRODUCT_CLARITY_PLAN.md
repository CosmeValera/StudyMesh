# AquaMesh Product Clarity Plan

## Goal

Make AquaMesh immediately read as a product for building dashboards without programming knowledge, not as a technical demo of React, Turborepo, Module Federation, or UI libraries.

The first impression should be:

> AquaMesh helps non-programmers create, arrange, save, and reuse dashboards from visual building blocks.

## Current Problem

The application already has useful no-code features, but the story is buried.

- The app-level README starts with Module Federation, so the project presents itself as architecture-first.
- The app UI starts inside an empty dashboard workspace with top-bar menus. A new visitor has to infer the purpose.
- Labels like `Widget Editor`, `Predefined Widgets`, `Manage Dashboards`, and `Advanced features` are accurate, but they sound like developer tooling rather than a dashboard-building product.
- The strongest user story lives in the tutorial and FAQ, not in the first screen.
- The product does not yet show a concrete user scenario, such as "build a small operations dashboard in minutes".
- The CV narrative can accidentally become "I built a React microfrontend app" instead of "I built a no-code dashboard builder for people who need dashboards but cannot code".

## Product Positioning

### One-Sentence Pitch

AquaMesh is a no-code dashboard builder where users can create dashboards by dragging visual blocks, customizing them, and saving reusable dashboard widgets without writing code.

### Short CV Pitch

Built AquaMesh, a no-code dashboard builder that lets non-technical users compose dashboards from reusable widgets, arrange them visually, save versions, and share/import their work. The project focuses on turning dashboard creation into a guided visual workflow rather than requiring users to write React or configuration code.

### Human Story

Many dashboards start as a developer task: someone needs a form, chart, controls, or status view, and a programmer has to wire the interface together. AquaMesh explores a simpler workflow: let a non-programmer assemble those pieces directly, name the result, save it, and reuse it across dashboards.

## Target Audience

Primary audience:

- Non-programmers who need to assemble simple dashboards.
- Internal-tool users who want to combine forms, charts, controls, and saved views.
- Product/operations people who want a visual way to prototype dashboards.

Secondary audience:

- Developers evaluating the implementation quality.
- Recruiters or interviewers looking for the project value.

The first audience should drive the UI and README story. The second audience should get implementation details later.

## Product Promise

A user should be able to understand these four steps in the first minute:

1. Start with a blank dashboard or template.
2. Add visual blocks/widgets.
3. Customize the blocks without code.
4. Save and reuse the dashboard or widget.

## Recommended Changes

### 1. Rewrite The README Around The Product

Priority: High

Current issue:

- The root README is closer to the right story, but it still mixes the product story with React/Turborepo/Module Federation early.
- `apps/aquamesh/README.md` is architecture-first.

Recommended structure:

1. Product headline: `AquaMesh: build dashboards without programming`.
2. Problem statement: dashboards usually require developers or code.
3. Product walkthrough: build, customize, save, reuse.
4. Demo GIF and live link.
5. Feature list written as user benefits.
6. Screenshots showing the creation flow.
7. Technical architecture as a later section.
8. Testing/build commands.

Better feature wording:

- `Visual dashboard builder`: create dashboards by adding and arranging widgets.
- `No-code widget editor`: design custom dashboard blocks from forms, text, charts, buttons, and layout containers.
- `Reusable widget library`: save widgets and add them to future dashboards.
- `Dashboard library`: save dashboard layouts with names, descriptions, tags, and visibility.
- `Import/export`: move widgets between environments or share them.
- `Version history`: restore previous widget versions.

Move technical wording later:

- React, TypeScript, Module Federation, Turborepo, Playwright, and Vitest are implementation credibility, not the product hook.

### 2. Add A First-Run Welcome Screen Or Empty State

Priority: High

Current issue:

- A new user lands in an empty dashboard area. The tutorial may open, but the core workspace itself does not explain what to do.

Recommended change:

- When the dashboard is empty, show a centered onboarding panel or workspace empty state:

  `Build your first dashboard`

  `Add ready-made widgets or create your own visual widget without code.`

  Primary actions:

  - `Create dashboard from template`
  - `Add widget`
  - `Build custom widget`

  Secondary action:

  - `Open tutorial`

Acceptance criteria:

- A visitor understands the app purpose without opening the README.
- The empty state disappears once the user adds a dashboard/widget.
- The actions open the same existing flows rather than creating duplicate functionality.

### 3. Rename Navigation Around User Outcomes

Priority: High

Current issue:

- `Widget Editor` is precise but abstract. It sounds like a technical tool inside a demo.

Recommended labels:

- `Dashboards` can stay, but menu items should say `Start blank dashboard`, `Use dashboard template`, and `Open saved dashboards`.
- `Widgets` should become `Add Widget`.
- `Widget Editor` should become `Build Widget` or `Create Widget`.
- `Manage Widgets` should become `Saved Widgets`.
- `Predefined Widgets` should become `Ready-made Widgets`.
- `Custom Widgets` should become `My Widgets`.

Recommended top bar on desktop:

- `Dashboards`
- `Add Widget`
- `Create Widget`
- `Tutorial`
- `FAQ`

Recommended mobile labels:

- `Dash`
- `Add`
- `Build`
- `Help`

### 4. Turn The Tutorial Into A Product Walkthrough

Priority: High

Current issue:

- The tutorial explains concepts, but it still reads partly like documentation.

Recommended tutorial flow:

1. `What you can build`: show a finished dashboard first.
2. `Add dashboard blocks`: choose ready-made widgets.
3. `Create your own widget`: drag fields, buttons, charts, and layout blocks.
4. `Save and reuse`: save widgets and dashboards.

Suggested first slide copy:

`AquaMesh lets you build dashboards without writing code. Start from a ready-made dashboard, add widgets, or design your own widget visually.`

Acceptance criteria:

- The first tutorial slide states the no-code dashboard-builder value proposition.
- The first image should be a finished dashboard, not only menus.
- Each slide has one clear action.

### 5. Add A Concrete Demo Scenario

Priority: High

Current issue:

- The app has generic examples like `Control Flow Dashboard` and `System Lens Dashboard`. They demonstrate architecture but not a real-world dashboard-building use case.

Recommended demo scenario:

`Operations Dashboard`

Example contents:

- Status summary card.
- Pie chart for issue categories.
- Toggle for maintenance mode.
- Text field for operator note.
- Button that triggers a notification.

Why this helps:

- It gives AquaMesh a story: someone can build an internal dashboard without coding.
- It makes screenshots and CV explanation easier.
- It gives interviewers a concrete product use case.

Alternative scenarios:

- `Small Business Dashboard`: appointments, revenue split, notes, task status.
- `Support Dashboard`: ticket categories, priority toggles, customer note field.
- `Project Dashboard`: delivery status, blockers, progress chart, team note.

Recommendation:

- Use `Operations Dashboard` because it is generic enough and fits the current widgets.

### 6. Reframe Existing Technical Features As Product Capabilities

Priority: Medium

Current issue:

- Features like import/export, versioning, and templates are strong, but they may feel like advanced developer features.

Recommended framing:

- Templates: `Start faster from reusable dashboard block patterns`.
- Import/export: `Share widget packs or back up your work`.
- Version history: `Recover an earlier version of a widget`.
- Module Federation: `AquaMesh can host independently built dashboard modules`.

This keeps the technical depth while making the user value clear first.

### 7. Improve The Widget Editor Empty State

Priority: Medium

Current issue:

- The empty canvas says `Drag and drop components here`, which explains mechanics but not outcome.

Recommended copy:

Title:

`Design a reusable dashboard widget`

Body:

`Add text, inputs, buttons, charts, and layout containers. Save the widget to reuse it in any dashboard.`

Actions:

- `Add text`
- `Add chart`
- `Start from template`

Acceptance criteria:

- Empty editor explains what a widget becomes after saving.
- Non-programmers do not need to understand the internal term `component` first.

### 8. Reduce Admin/User Friction In The Demo

Priority: Medium

Current issue:

- The app auto-sets an admin user, but the UI still exposes roles and admin concepts. For a public portfolio demo, this can distract from the product.

Recommended approach:

- Keep permission code if it matters technically.
- In demo mode, avoid making `ADMIN_ROLE` prominent in the top bar.
- Use friendly labels such as `Builder mode` instead of exposing role internals.

Acceptance criteria:

- A portfolio visitor is not confused by admin-only wording.
- The user menu does not become part of the first product story.

### 9. Make The First Screenshot Tell The Whole Story

Priority: Medium

Current issue:

- If screenshots show only menus or empty states, viewers may see a UI exercise, not a product.

Recommended screenshot set:

1. Finished `Operations Dashboard`.
2. Widget editor with components on the canvas.
3. Saved widgets library.
4. Dashboard save dialog or dashboard library.

README order should follow the story:

- Result first.
- Builder second.
- Reuse/save third.
- Architecture last.

### 10. Update CV And Portfolio Copy

Priority: Medium

Recommended CV bullet:

`Built AquaMesh, a no-code dashboard builder that lets users visually compose dashboards from reusable widgets, customize components, save dashboard layouts, and restore previous widget versions.`

Optional second bullet:

`Implemented the product as a TypeScript/React monorepo with drag-and-drop layout editing, persistent local widget/dashboard libraries, import/export, version history, and Playwright/Vitest coverage.`

Portfolio title:

`AquaMesh - No-code dashboard builder`

Portfolio subtitle:

`A visual workspace for creating dashboards from reusable widgets without writing React or configuration code.`

Recommended story paragraph:

`I built AquaMesh to explore a common internal-tool problem: dashboards are useful, but creating them usually requires a developer. AquaMesh turns that workflow into a visual editor where users can assemble widgets, customize them, save versions, and reuse them across dashboards.`

## Suggested Implementation Phases

### Phase 1: Product Story Only

- Rewrite root README.
- Rewrite `apps/aquamesh/README.md` so product value comes before architecture.
- Add a concise portfolio/CV section.
- Choose the demo scenario and screenshot sequence.

No functional code required.

### Phase 2: First-Run Clarity

- Add dashboard empty state.
- Rename top-bar labels and menu labels.
- Adjust tutorial first slide and FAQ opening answer.
- Hide or soften role/admin details in demo mode.

Small UI/code changes.

### Phase 3: Demo Scenario

- Add one strong predefined dashboard template.
- Add one or two widget templates that match the scenario.
- Update screenshots/GIF.
- Make the README demo use this scenario.

Moderate UI/data changes.

### Phase 4: Polish For Portfolio

- Verify mobile and desktop first impressions.
- Run unit/e2e tests.
- Update snapshots intentionally.
- Record a short GIF showing: create dashboard, add widget, build custom widget, save.

## Success Criteria

A new visitor should be able to answer these questions in under 30 seconds:

- What is AquaMesh? A no-code dashboard builder.
- Who is it for? People who need dashboards without writing code.
- What can I do with it? Build dashboards, create widgets, save/reuse/share them.
- Why is it more than a React demo? It solves a clear product workflow with persistence, templates, libraries, import/export, and version history.

## Recommended Next Step

Start with Phase 1. It gives the biggest improvement for CV/portfolio perception without risking app behavior. After that, implement the empty state and navigation copy changes from Phase 2.
