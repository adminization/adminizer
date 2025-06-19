## Development
- **`npm run dev`**  
  Starts the application in development mode with file watching, using the Waterline fixture configuration and `VITE_ENV=dev`.

- **`npm run watch:backend`**  
  Watches for changes in backend files and recompiles TypeScript continuously.

## Build Commands
- **`npm run build:assets`**  
  Builds frontend assets using Vite.

- **`npm run build:backend`**
  Combines backend copy and compilation steps.

- **`npm run build:ui`**
  Builds the React UI library to `dist/ui`.

- **`npm run build`**
  Full build process: copies backend, compiles backend, builds the UI library, and builds assets.

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
- **`npm run start:seed`**  
  Starts the application with seed data enabled (using `SEED_DATA=true`).

- **`npm run demo:build`**  
  Prepares a demo build: copies backend, compiles backend, builds assets, and copies modules.

- **`npm run demo`**  
  Alias for `start:seed` - runs the demo with seeded data.

## Preview mode
- **`npm start`**  
  Starts the application using TSX with the Waterline fixture configuration.
