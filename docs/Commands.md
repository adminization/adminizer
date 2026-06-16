## Adminizer Commands

## Development

- **`npm run dev`**
  Starts the Sequelize fixture in development mode with file watching and seed data.

- **`npm run dev:no-seed`**
  Starts the Sequelize fixture in development mode without seed data.

- **`npm run dev:typeorm`**
  Starts the experimental TypeORM fixture in development mode with file watching and seed data.

- **`npm run dev:typeorm:no-seed`**
  Starts the experimental TypeORM fixture in development mode without seed data.

- **`npm run dev:cors`**
  Starts the Sequelize fixture with CORS settings for frontend integration testing.

- **`npm run dev:no-seed-clean`**
  Starts the Sequelize fixture without seed data and removes `.tmp` before startup.

- **`npm run tsc:watch`**
  Watches backend TypeScript and recompiles continuously.

Development mode is detected with `ADMINIZER_ENV=dev`. The bundled `dev` scripts set it automatically. In this mode app assets registered with `ctx.asset({ devUrl })` use `devUrl` instead of the production file.

## Start Commands

- **`npm run start`**
  Starts the Sequelize fixture without seed data.

- **`npm run start:seed`**
  Starts the Sequelize fixture with seed data.

- **`npm run start:typeorm`**
  Starts the experimental TypeORM fixture without seed data.

- **`npm run start:typeorm:seed`**
  Starts the experimental TypeORM fixture with seed data.

## Build Commands

- **`npm run build`**
  Full package build: copy backend, compile backend, compile UI, and build frontend assets.

- **`npm run build:backend`**
  Copy backend files and compile backend TypeScript.

- **`npm run compile:backend`**
  Compile backend TypeScript with `src/tsconfig.json` and append `.js` extensions in generated imports.

- **`npm run compile:ui`**
  Compile the shared UI TypeScript package.

- **`npm run build:assets`**
  Build the main Adminizer frontend assets and all built-in control ES modules with Vite.

- **`npm run build:controls`**
  Build only the built-in control ES modules and their styles.

- **`npm run copy:backend`**
  Copy backend resources before compilation, including `translations`, `files`, and `fileicons` used by the core media manager routes.

## App And Module Builds

- **`npm run build:apps`**
  Builds all fixture app frontend modules and fixture virtual catalog components: notification-sender, module-manager, navigation catalog templates, React-Quill, and virtual catalog React templates/actions.

- **`npm run build:catalog-modules`**
  Builds fixture virtual catalog React components from `fixture/virtual-catalog`.

Project modules should usually define their own Vite build script. See [BuildingModules.md](BuildingModules.md) for current `AbstractAdminizerApp` and `AppManager` usage.

## Tests

- **`npm run test`**
  Runs Vitest once with `--watch=false`.

- **`npm run test:watch`**
  Runs Vitest in watch/verbose mode.
