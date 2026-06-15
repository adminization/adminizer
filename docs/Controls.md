[Back](index.md)

# Controls

## Overview

Controls are dynamically loaded form components used for WYSIWYG, Markdown, table, JSON, code, and GeoJSON fields.

Adminizer has two control sources:

- built-in controls registered by the core during initialization;
- app-owned controls registered through `AppSetupContext.control()`.

Control JavaScript and CSS are not loaded with the main Adminizer bundle. The field renderer imports them when a control field is rendered on an add or edit page. Visiting the dashboard does not load control bundles.

## Control Contract

The public control types are exported from `adminizer`:

```ts
export type ControlType =
  | "wysiwyg"
  | "jsonEditor"
  | "geoJson"
  | "markdown"
  | "table"
  | "codeEditor";

export type Config =
  Record<string, string | string[] | object | number | boolean>;

export interface Control {
  readonly name: string;
  readonly type: ControlType;

  getConfig(): Config | undefined;
  getJsPath(): string | undefined;
  getCssPath(): string | undefined;
  getName(): string;
}
```

There is no `AbstractControls` base class. Built-in controls implement `Control` directly and receive only `routePrefix` in their constructors.

`Path` is an optional helper type used by the built-in implementations:

```ts
export interface Path {
  jsPath: {
    dev: string;
    production: string;
  };
  cssPath: string;
}
```

## Built-In Controls

Core registers these defaults:

| Type | Default name |
|---|---|
| `wysiwyg` | `ckeditor` |
| `markdown` | `toast-ui` |
| `table` | `handsontable` |
| `jsonEditor` | `jsoneditor` |
| `codeEditor` | `monaco` |
| `geoJson` | `leaflet` |

Each built-in control is compiled to a separate ES module under `/assets/controls`. Production styles are also emitted separately. In development, Vite serves the TSX entry directly.

Some built-in controls are also exposed through `window.JSComponents`. Those exports are lazy proxies: importing the Adminizer UI globals does not immediately download the control implementation.

## App-Owned Controls

Custom controls should be implemented as Adminizer apps. The app registers the component and optional stylesheet with `ctx.control()`:

```ts
import path from "path";
import {
  AbstractAdminizerApp,
  type AppSetupContext,
  type Config,
} from "adminizer";

interface MyEditorAppConfig {
  config: Config;
  componentFile: string;
  componentDevUrl: string;
  stylesheetFile: string;
  stylesheetDevUrl: string;
}

export class MyEditorApp extends AbstractAdminizerApp<MyEditorAppConfig> {
  readonly name = "my-editor";
  readonly version = "1.0.0";
  declare readonly config: MyEditorAppConfig;

  constructor(config: Partial<MyEditorAppConfig> = {}) {
    super();
    this.config = {
      config: {},
      componentFile: path.resolve(import.meta.dirname, "my-editor.es.js"),
      componentDevUrl: "/apps/my-editor/my-editor.tsx",
      stylesheetFile: path.resolve(import.meta.dirname, "my-editor.css"),
      stylesheetDevUrl: "/apps/my-editor/my-editor.css",
      ...config,
    };
  }

  setup(ctx: AppSetupContext): void {
    ctx.control({
      type: "wysiwyg",
      name: "my-editor",
      config: this.config.config,
      component: {
        id: "editor",
        filePath: this.config.componentFile,
        devUrl: this.config.componentDevUrl,
      },
      stylesheet: {
        id: "editor-css",
        filePath: this.config.stylesheetFile,
        devUrl: this.config.stylesheetDevUrl,
      },
    });
  }
}
```

`component` is required. `stylesheet` is optional. Both use the same `AppAsset` contract as `ctx.asset()`:

```ts
interface AppAsset {
  id: string;
  filePath: string;
  route?: string;
  devUrl?: string;
}
```

In development, `devUrl` is returned directly. In production, Adminizer creates app-owned asset routes under `routePrefix`.

Enable the app after Adminizer initialization:

```ts
await adminizer.init(adminpanelConfig);
await adminizer.appManager.enable(new MyEditorApp());
```

Disabling or unregistering the app removes its control registration and asset routes:

```ts
await adminizer.appManager.disable("my-editor");
```

## Frontend Component

A control module must export its React component as the default export:

```tsx
interface ControlProps {
  options?: Record<string, unknown>;
  initialValue: unknown;
  onChange: (value: unknown) => void;
  name: string;
  disabled?: boolean;
}

export default function MyEditor({
  initialValue,
  onChange,
  disabled,
}: ControlProps) {
  // Render the editor and call onChange with its current value.
}
```

Adminizer loads the stylesheet and component module in parallel. Loaded stylesheets are cached and are not appended more than once.

## Vite Build

Build the frontend component as an ES module. Externalize React so the control uses the Adminizer runtime copy:

```ts
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {viteExternalsPlugin} from "vite-plugin-externals";
import path from "path";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "production"
    ),
  },
  plugins: [
    react(),
    viteExternalsPlugin({
      react: "React",
      "react-dom": "ReactDOM",
    }),
  ],
  build: {
    outDir: import.meta.dirname,
    emptyOutDir: false,
    lib: {
      entry: path.resolve(import.meta.dirname, "my-editor.tsx"),
      name: "MyEditor",
      formats: ["es"],
      fileName: (format) => `my-editor.${format}.js`,
      cssFileName: "my-editor",
    },
  },
});
```

The fixture React-Quill example is in `fixture/apps/quill-editor`. All fixture app frontend modules, including Quill, are built together:

```bash
npm run build:apps
```

## Field Configuration

Reference the registered control by name:

```ts
editor: {
  title: "Editor",
  type: "wysiwyg",
  options: {
    name: "my-editor",
    config: {
      theme: "snow",
    },
  },
}
```

The control's base config is merged with the field config. Field values take precedence.

## Missing Or Disabled Controls

If a configured control is not registered, for example because its app is disabled, Adminizer:

1. logs one server warning per model field and missing control;
2. falls back to the built-in default for that control type;
3. does not pass the missing control's field config to the fallback control.

The third rule prevents options intended for one editor from being applied to an incompatible editor.

If the built-in default is also missing, Adminizer throws a configuration error.

## ControlsHandler

`ControlsHandler` stores controls by type and name. Its API is:

```ts
add(control: Control): void;
get(type: ControlType, name: string): Control | undefined;
getByType(type: ControlType): Control[];
remove(type: ControlType, name: string): boolean;
getAll(): Record<ControlType, Control[]>;
```

Adding a duplicate name within the same type throws an error.

Application modules should normally use `ctx.control()` instead of calling `adminizer.controlsHandler.add()` directly. App registration provides ownership, asset serving, rollback when enable fails, and cleanup during disable or unregister.
