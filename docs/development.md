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

Adminizer uses `ADMINIZER_ENV=dev` to switch on development behavior such as Vite middleware and app asset `devUrl` paths.

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
  Build Adminizer frontend assets with Vite.

## App And Module Builds

- **`npm run build:apps`**
  Builds fixture app modules: component-b, module-manager, and navigation catalog templates.

- **`npm run build:react-quill`**
  Builds the React-Quill WYSIWYG control module.

- **`npm run build:catalog-modules`**
  Builds test catalog modules from `modules/testCatalog`.

Project modules should usually define their own Vite build script. See [BuildingModules.md](BuildingModules.md) for current `AbstractAdminizerApp` and `AppManager` usage.

## Start And Seeding

- **`npm run start`**
  Starts the Sequelize fixture without seed data.

- **`npm run start:seed`**
  Starts the Sequelize fixture with seed data.

- **`npm run start:typeorm`**
  Starts the experimental TypeORM fixture without seed data.

- **`npm run start:typeorm:seed`**
  Starts the experimental TypeORM fixture with seed data.
