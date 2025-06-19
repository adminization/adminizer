# Using Adminizer UI Components

Adminizer ships with a set of reusable React UI components located under `src/assets/js/components`. These components are compiled to the `dist/ui` directory during the build process so they can be imported in other projects.

## Build

Running `npm run build` compiles backend code, builds the UI library and frontend assets. The compiled components are placed in `dist/ui` alongside their TypeScript declaration files.

## Importing

After installing Adminizer from npm you can import the components directly:

```ts
import { Button, Dialog } from 'adminizer/dist/ui'
```

Each component is exported from `dist/ui/index.js` which aggregates the entire set of UI components.
