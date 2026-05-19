## Development
- **`npm run dev`**
  Starts the application in development mode using Sequelize with file watching.
- **`npm run dev:typeorm`**
  Starts the application in development mode using the experimental TypeORM fixture with file watching.
- **`npm run dev:no-seed`**
  Starts the Sequelize fixture in development mode without seed data.
- **`npm run dev:typeorm:no-seed`**
  Starts the TypeORM fixture in development mode without seed data.
- **`npm run dev:no-seed-clean`**
  Starts the Sequelize fixture without seed data and cleans `.tmp` before startup.
- **`npm run dev:cors`**
  Starts the Sequelize fixture with CORS settings for frontend integration testing.

- **`npm run tsc:watch`**  
  Watches for changes in backend files and recompiles TypeScript continuously.

Adminizer uses `ADMINIZER_ENV=dev` to switch on development behavior such as
Vite middleware and dev module paths.

## Build Commands
- **`npm run build:assets`**  
  Builds frontend assets using Vite.

- **`npm run build:backend`**  
  Combines backend copy and compilation steps.

- **`npm run compile:backend`**  
  Compiles backend TypeScript and appends `.js` extensions in generated imports.

- **`npm run compile:ui`**  
  Compiles the shared UI TypeScript package.

- **`npm run build`**  
  Full build process: copies backend, compiles backend, compiles UI, and builds assets.

## Module-specific Builds (this is just for tests, as an example, you should create your own commands to build modules)
- **`npm run build:module`**  
  Builds test modules using a custom Vite config.

- **`npm run build:react-quill`**  
  Builds the React-Quill WYSIWYG module using a custom Vite config.

- **`npm run copy:modules`**  
  Copies modules using `copy-modules.js` script.

- **`npm run build:assets:modules`**  
  Builds assets and copies modules.

## Demo & Seeding
- **`npm run start`**  
  Starts the Sequelize fixture without seed data.

- **`npm run start:typeorm`**  
  Starts the experimental TypeORM fixture without seed data.

- **`npm run start:seed`**  
  Starts the Sequelize fixture with seed data enabled.

- **`npm run start:typeorm:seed`**  
  Starts the experimental TypeORM fixture with seed data enabled.

- **`npm run demo:build`**  
  Prepares a demo build: copies backend, compiles backend, builds assets, and copies modules.

- **`npm run demo`**  
  Runs the Sequelize demo with seeded data.

- **`npm run demo:typeorm`**  
  Runs the experimental TypeORM demo with seeded data.
