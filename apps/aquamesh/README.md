# AquaMesh app

AquaMesh is the main no-code custom widget builder in this monorepo. It gives non-programmers a visual workspace for creating reusable widgets from text, inputs, buttons, charts, images, and layout blocks, then arranging them into dashboards or focused workspaces without writing UI code.

## Product workflow

1. Create a custom widget visually from text, inputs, buttons, charts, controls, and layout containers.
2. Preview and save the widget to the local widget library.
3. Add the saved widget to a dashboard.
4. Save dashboard layouts for reuse.
5. Import, export, or restore widget versions when work needs to move or be recovered.

For demo and portfolio use, **Daily Operations** remains one concrete example: orders today, delayed tasks, support ticket mix, system status, team notes, and a handoff action. AquaMesh is broader than that single dashboard: architects can organize site-review notes, biologists can collect observation logs, and teams can build task or research workspaces without waiting for custom code.

## User-facing capabilities

- **Visual dashboard builder:** Arrange dashboard widgets with drag, resize, and tabbed layout tools.
- **No-code widget editor:** Create reusable dashboard blocks without programming.
- **Reusable widget library:** Save widgets and add them to future dashboards.
- **Dashboard library:** Save layouts with names, descriptions, tags, and visibility settings.
- **Import/export:** Share widget packs or back up dashboard-building work.
- **Version history:** Recover an earlier version of a widget.

## Available scripts

From the repository root, run:

```sh
npm start
npm test
npm --workspace aquamesh run test:unit
npm --workspace aquamesh run test:e2e
npm --workspace aquamesh run test:snapshot
```

From `apps/aquamesh`, the local app scripts are:

### `npm start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Runs both unit and end-to-end tests for the AquaMesh app.

More specific test commands:

- `npm run test:unit` runs unit tests.
- `npm run test:snapshot` updates Playwright snapshots.
- `npm run test:e2e` runs end-to-end tests.

## Technical stack

- React 18
- TypeScript
- Webpack
- Material UI and PrimeReact
- SCSS modules
- flexlayout-react and react-tabs
- Vitest and Playwright

## Architecture

AquaMesh is the application for the widget builder and dashboard workspace. Widgets and dashboards are stored locally for demo use. The workspace supports reusable widgets, dashboard templates, import/export, and version history.
