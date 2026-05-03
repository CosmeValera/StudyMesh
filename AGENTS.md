# Repository Guidelines

## Project Structure & Module Organization

AquaMesh is an npm/Turborepo monorepo. Application code lives in `apps/`: `apps/aquamesh` is the main dashboard builder, `apps/control-flow` and `apps/system-lens` are federated React apps. Shared packages live in `packages/`, including `packages/ui`, `packages/eslint-config`, and `packages/typescript-config`. Theme and PrimeReact SCSS sources are under `style/`. Documentation images and tutorials are in `readme_docs/`. Git hook utilities are in `tools/git-hooks/`.

Within each app, source files are in `src/`, public assets are in `public/`, and build output goes to `dist/`. AquaMesh tests are split into `apps/aquamesh/tests/unit` and `apps/aquamesh/tests/e2e`.

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
