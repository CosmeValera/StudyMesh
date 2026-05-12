# Repository Guidelines

## Project Structure & Module Organization

AquaMesh is an npm/Turborepo monorepo. Application code lives in `apps/`: `apps/aquamesh` is the main dashboard builder, `apps/control-flow` and `apps/system-lens` are federated React apps. Shared packages live in `packages/`, including `packages/ui`, `packages/eslint-config`, and `packages/typescript-config`. Theme and PrimeReact SCSS sources are under `style/`. Documentation images and tutorials are in `readme_docs/`. Git hook utilities are in `tools/git-hooks/`.

Within each app, source files are in `src/`, public assets are in `public/`, and build output goes to `dist/`. AquaMesh tests are split into `apps/aquamesh/tests/unit` and `apps/aquamesh/tests/e2e`.

## Product Direction & Core Workflows

AquaMesh is evolving from a dashboard builder into a student knowledge wiki centered on the Create Study Pack feature. Study Packs should let students quickly turn notes, references, learning materials, and related data into useful widgets and reusable views without having to manually design every dashboard and widget first.

Treat Create Study Pack as the primary workflow for most student users:

- Create a Study Pack from student materials or a learning goal.
- Generate or assemble the widgets needed for that Study Pack quickly.
- Open the resulting Study Pack or dashboard in the main workspace for study, editing, and reuse.

Manual dashboard and widget creation still exists, but it is now the advanced workflow. Keep those actions available for users who want precise control, but avoid making students rely on separate "create dashboard" and "create widget" steps before they can start studying.

A planned future capability is allowing users to provide their own API key to improve LLM-generated Study Pack widgets. This should enable richer generated learning materials such as custom exercises, quizzes, flashcards, and related practice content, including useful study aids that were not explicitly mentioned in the raw notes.

Keep the main AquaMesh experience clear about the difference between:

- Fast path: Create Study Pack.
- Advanced path: manually create a widget or dashboard.
- Workspace path: open an existing Study Pack or dashboard in the main workspace.

Creation flows can remain modal-driven when they are setup tasks. Opening an existing Study Pack or dashboard should take the user into the main workspace rather than sharing the same modal flow.

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
