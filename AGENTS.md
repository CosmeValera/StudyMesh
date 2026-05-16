# Repository Guidelines

## Project Structure & Module Organization

AquaMesh is an npm/Turborepo monorepo. Application code lives in `apps/`: `apps/aquamesh` is the main dashboard builder, `apps/control-flow` and `apps/system-lens` are federated React apps. Shared packages live in `packages/`, including `packages/ui`, `packages/eslint-config`, and `packages/typescript-config`. Theme and PrimeReact SCSS sources are under `style/`. Documentation images and tutorials are in `readme_docs/`. Git hook utilities are in `tools/git-hooks/`.

Within each app, source files are in `src/`, public assets are in `public/`, and build output goes to `dist/`. AquaMesh tests are split into `apps/aquamesh/tests/unit` and `apps/aquamesh/tests/e2e`.

## Product Direction & Core Workflows

AquaMesh is evolving from a dashboard builder into a student knowledge wiki. The main product goal is helping students turn prompts, messy notes, camera pictures, references, and learning materials into useful tutorials, study dashboards, widgets, exercises, and reusable workspace views without forcing them to manually design dashboards or widgets first.

Keep the main AquaMesh experience clear about the current primary workflows:

- Create Study Path: creates a tutorial from a user prompt using the selected generation mode.
- Create From Notes: previously Create Study Pack. Translates messy text notes or camera pictures into a clearer study dashboard with exercises. Future iterations should let users choose the output shape, such as ordered markdown notes, exercise/exam-style practice, or a mix of clearer notes and exercises based on the notes.
- Advanced path: manually create a widget or dashboard. This is the least ideal path for beginner students and should gradually become less prominent. In the future, it may be hidden behind a settings option that enables advanced creation actions in the top navigation menu.
- Workspace path: open an existing Study Path tutorial, Study Pack, or custom dashboard in the main workspace for study, editing, and reuse.

Create Study Path and Create From Notes should support several generation modes. Use Create From Notes as the forward-looking name, while still recognizing older Create Study Pack references in existing code or UI until the rename is complete.

- Basic fallback: does not use AI. It parses notes programmatically from keywords and obvious structure. It is instantaneous, but usually produces weak results. This mode only supports Create From Notes/Create Study Pack flows, not Study Path. For images, it relies on basic OCR such as Tesseract, so it works best on clear screenshots, slides, or obvious printed text and performs poorly on messy handwritten notes.
- Gemini API token: bring-your-own Gemini token/key. This is the preferred high-quality path for users who already have an API key and want richer AI-generated study materials.
- Google local AI: runs free and locally, with no internet connection required. Results are usually worse than Gemini API mode, but better than Basic fallback. It can still help with image discovery and can turn messy handwritten-note images into usable notes better than the basic OCR fallback.
- Hoisted tokens: not implemented yet. The intended product direction is to give new users a small free allowance, such as 5-10 generations using the app owner's Gemini token. After that, users should switch to local AI, provide their own API token, or optionally make a small payment for continued hosted-token usage, for example a low one-time payment with an hourly usage allowance. This needs payment integration such as Stripe and should avoid feeling like a subscription unless the product direction changes.

Generation flows can remain modal-driven when they are setup tasks. Opening an existing Study Path tutorial, Study Pack, or custom dashboard should take the user into the main workspace rather than sharing the same modal flow.

## Build, Test, and Development Commands

Run commands from the repository root unless noted:

- `npm install` installs workspace dependencies.
- `npm start` runs `turbo start` for app dev servers.
- `npm run build` runs production builds through Turbo.
- `npm test` runs package test tasks.
- `npm run format` formats `ts`, `tsx`, and `md` files with Prettier.
- `npm --workspace aquamesh run test:unit` runs AquaMesh Vitest unit tests.
- `npm --workspace aquamesh run test:e2e` runs AquaMesh Playwright tests.
- `npm --workspace aquamesh run test:snapshot` updates Playwright snapshots.

For hook tests, run `tools/git-hooks/lib/bashunit tools/git-hooks/tests`.

## Coding Style & Naming Conventions

Use TypeScript/React patterns already present in each app. Components use PascalCase filenames such as `WidgetEditor.tsx`; hooks use `useX.ts`; SCSS modules use `*.module.scss`. AquaMesh ESLint requires 2-space indentation, no semicolons, `eqeqeq`, and braces for all control blocks. Prefer named exports for reusable shared code and keep app-specific code inside its app boundary.

## Testing Guidelines

Use Vitest with React Testing Library for unit tests and Playwright for end-to-end coverage. Name unit tests `*.test.ts` or `*.test.tsx`; name e2e specs `*.spec.ts`. Keep snapshots in the existing `*-snapshots` folders and update them only when the visual change is intentional.

## Commit & Pull Request Guidelines

Commit history uses prefixed subjects, for example `AquaMesh:MAIN Make admin the default user`. Install the hook with `tools/git-hooks/init.sh` to auto-prefix commit messages. Keep subjects imperative and specific.

Pull requests should describe the change, list tested commands, link related issues, and include screenshots or snapshot notes for UI changes. Mention affected apps or packages, especially for module federation, shared UI, or theme changes.

## Security & Configuration Tips

Do not commit secrets or local environment files. Keep deployment config changes in `vercel.json` coordinated with app-level webpack configs, since the project relies on Turbo and module federation paths.
