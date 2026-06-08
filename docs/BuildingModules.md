# Adminizer App Modules

Adminizer modules are backend-first extensions built around `AbstractAdminizerApp` and `AppManager`. A module can register routes, frontend assets, config patches, access rights, runtime models, model access scopes, catalogs, catalog template components, and event listeners. This is the current extension mechanism for features such as the fixture module pages, module manager, and navigation catalog.

Older standalone React page modules and custom field controls still exist as frontend patterns, but a full Adminizer module should be installed through `adminizer.appManager`.

## Core Types

Import module contracts from Adminizer:

```ts
import {
  AbstractAdminizerApp,
  AppSetupContext,
  AppRuntime,
} from "adminizer";
```

A module extends `AbstractAdminizerApp`:

```ts
export class MyApp extends AbstractAdminizerApp<MyAppConfig> {
  readonly name = "my-app";
  readonly version = "1.0.0";
  declare readonly config: MyAppConfig;

  constructor(config: Partial<MyAppConfig> = {}) {
    super();
    this.config = {
      route: "/my-app",
      ...config,
    };
  }

  setup(ctx: AppSetupContext): void | Promise<void> {
    // Register resources here.
  }
}
```

Enable it after `adminizer.init(config)`:

```ts
await adminizer.init(adminpanelConfig);
await adminizer.appManager.enable(new MyApp());
```

`AppManager.enable(app)` registers the app if needed, runs `setup(ctx)`, waits for deferred model/model-access/catalog registrations, and stores disposers for later `disable()` or `unregister()`.

## Resource Registration

`setup(ctx)` receives an `AppSetupContext` with these methods:

| Method | Purpose |
|---|---|
| `ctx.asset(asset)` | Expose a JS/CSS/static file and return its URL. In `ADMINIZER_ENV=dev`, `devUrl` is returned directly. In production, Adminizer creates a static controller for `filePath`. |
| `ctx.controller(controller)` | Register an Express route under `config.routePrefix`; returns the resolved full path. |
| `ctx.config(patch, id?)` | Merge a config patch into `adminizer.config`. Arrays of objects with `id` are merged by id; other arrays are appended. |
| `ctx.accessRight(token)` | Register an access rights token owned by the app. |
| `ctx.model(model)` | Register a runtime model through the active ORM adapter. Sequelize is the primary supported adapter. |
| `ctx.modelAccess(access)` | Allow the app runtime to access selected models through `runtime.models`. |
| `ctx.catalog(catalog)` | Register a catalog directly or through a factory that receives `AppRuntime`. |
| `ctx.catalogTemplateComponent(component)` | Register a React template component for catalog add/edit forms. |
| `ctx.listener(event, handler)` | Subscribe to Adminizer events. The handler receives `(payload, runtime)`. |

Registration order after `setup()` is intentional: runtime models first, model access second, catalogs third. This lets catalog factories safely use models registered by the same app.

## App Runtime

Catalog factories and event listeners receive `AppRuntime`:

```ts
interface AppRuntime {
  models: AppModelAccess;
  config: {
    readonly routePrefix: string;
    getModelConfig(modelName: string): ModelConfig | undefined;
  };
}
```

Use `runtime.models.get<T>(modelName)` only for models declared through `ctx.modelAccess()`. This keeps internal and app model access explicit.

```ts
ctx.modelAccess({ models: ["Navigation", "Category"] });

ctx.catalog({
  id: "navigation",
  factory: async (runtime) => {
    const navigationModel = runtime.models.get("Navigation");
    // Create and return AbstractCatalog.
  },
});
```

## Routes And Policies

`ctx.controller()` registers routes through `ControllerHandler`. The route is automatically prefixed with `adminizer.config.routePrefix`.

```ts
const pageUrl = ctx.controller({
  id: "page",
  method: "get",
  route: "/my-app",
  middleware: async (req, res) => {
    return req.Inertia.render({
      component: "module",
      props: {
        moduleComponent,
        data: { rows: [] },
      },
    });
  },
  policies: [{ type: "auth", mode: "ui" }],
});
```

Supported policy types:

| Policy | Meaning |
|---|---|
| `{ type: "auth", mode?: "ui" | "api" }` | Require authenticated user. |
| `{ type: "auth-enabled" }` | Require auth only when auth is enabled. |
| `{ type: "admin", mode?: "ui" | "api" }` | Require admin user. |
| `{ type: "permission", token, mode?: "ui" | "api" }` | Require one access token. |
| `{ type: "any-permission", tokens, mode?: "ui" | "api" }` | Require any token from a list. |

Use `mode: "ui"` for Inertia pages and `mode: "api"` for JSON endpoints.

## Frontend Page Module

Adminizer renders app pages with the shared Inertia page `module`. Your controller passes `moduleComponent`; the page dynamically imports that ES module and renders its default export.

```tsx
// MyAppPage.tsx
export default function MyAppPage({ data }: { data?: { rows: Array<{ id: number; name: string }> } }) {
  const { Button, Card, CardContent } = window.UIComponents;

  return (
    <Card>
      <CardContent>
        {data?.rows.map((row) => (
          <Button key={row.id}>{row.name}</Button>
        ))}
      </CardContent>
    </Card>
  );
}
```

Register the built asset and route:

```ts
const moduleComponent = ctx.asset({
  id: "component",
  filePath: path.resolve(import.meta.dirname, "MyAppPage.es.js"),
  devUrl: "/apps/my-app/MyAppPage.tsx",
});

ctx.controller({
  id: "page",
  method: "get",
  route: "/my-app",
  middleware: async (req, res) => req.Inertia.render({
    component: "module",
    props: {
      moduleComponent,
      data: { rows: await loadRows() },
    },
  }),
  policies: [{ type: "auth", mode: "ui" }],
});
```

Add a sidebar link through a config layer:

```ts
ctx.config({
  navbar: {
    additionalLinks: [{
      id: "my-app",
      link: pageUrl,
      type: "self",
      title: "My App",
      icon: "settings",
      section: "Platform",
    }],
  },
});
```

## Runtime Models

A module can register its own internal storage model:

```ts
ctx.model({
  name: "MyAppState",
  schema: {
    id: { type: "number", autoIncrement: true, primaryKey: true },
    label: { type: "string", required: true, unique: true },
    payload: { type: "json", required: true },
  },
  sync: true,
});

ctx.modelAccess({ models: ["MyAppState"] });
```

`adapter` is optional. If omitted, Adminizer uses `config.system.defaultORM` or the only registered ORM adapter. Sequelize is the recommended default; TypeORM is experimental.

## Catalog Template Components

Catalog item types return add/edit templates with a `type` string:

```ts
async getAddTemplate(req: ReqType) {
  return {
    type: "my-catalog.item-form",
    data: { labels: { save: req.i18n.__("Save") } },
  };
}
```

A module maps that template `type` to a React component through `ctx.catalogTemplateComponent()`:

```ts
const catalogTemplates = ctx.asset({
  id: "catalog-templates",
  filePath: path.resolve(import.meta.dirname, "CatalogTemplates.es.js"),
  devUrl: "/apps/my-app/CatalogTemplates.tsx",
});

ctx.catalogTemplateComponent({
  id: "item-form",
  catalog: "my-catalog",
  type: "my-catalog.item-form",
  component: catalogTemplates,
  exportName: "MyCatalogItemTemplate",
});
```

`catalog` can be a string, an array of catalog slugs, or omitted. Omit it only for a global template type. `CatalogTemplateComponentHandler` prevents two enabled components from claiming the same template type in the same catalog scope.

Template props on the frontend:

```ts
interface CatalogTemplateComponentProps {
  mode: "create" | "update";
  type: string;
  template: { type: string; data: any };
  parentId: string | number;
  itemType: string | null;
  selectedItem?: Record<string, any>;
  messages: Record<string, string>;
  actions: {
    close: () => void;
    reload: (item?: any) => Promise<void>;
    openModelAdd: (model: string) => Promise<void>;
  };
}
```

A minimal template:

```tsx
export function MyCatalogItemTemplate({ template, itemType, parentId, actions }: CatalogTemplateComponentProps) {
  const { Button, Input, Label } = window.UIComponents;
  const [name, setName] = React.useState("");

  const save = async () => {
    const res = await window.adminApi.post("", {
      _method: "createItem",
      data: {
        type: itemType,
        parentId,
        name,
      },
    });
    actions.close();
    await actions.reload(res.data.data);
  };

  return (
    <div className="p-8 grid gap-4">
      <Label>{template.data.labels?.name ?? "Name"}</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} />
      <Button onClick={save}>Save</Button>
    </div>
  );
}
```

## Catalog Module Pattern

For catalogs, prefer registering through an app instead of calling `adminizer.catalogHandler.add()` directly. The module can register storage models, access rights, sidebar links, catalog templates, and event listeners in one place.

```ts
export class MyCatalogApp extends AbstractAdminizerApp<MyCatalogAppConfig> {
  readonly name = "my-catalog";
  readonly version = "1.0.0";
  declare readonly config: MyCatalogAppConfig;

  constructor(config: MyCatalogAppConfig) {
    super();
    this.config = config;
  }

  setup(ctx: AppSetupContext): void {
    ctx.accessRight({
      id: "catalog-my-catalog",
      name: "My Catalog",
      description: "Access to My Catalog",
      department: "Catalog",
    });

    ctx.model({
      name: "MyCatalogStorage",
      schema: {
        id: { type: "number", autoIncrement: true, primaryKey: true },
        label: { type: "string", required: true, unique: true },
        tree: { type: "json", required: true },
      },
      sync: true,
    });

    ctx.modelAccess({ models: ["MyCatalogStorage"] });

    ctx.config({
      navbar: {
        additionalLinks: [{
          id: "my-catalog-main",
          type: "self",
          link: `${this.config.routePrefix}/catalog/my-catalog/main`,
          title: "My Catalog",
          icon: "folder",
          accessRightsToken: "catalog-my-catalog",
        }],
      },
    });

    ctx.catalog({
      id: "my-catalog",
      factory: async (runtime) => {
        const catalog = new MyCatalog(runtime, this.config);
        await catalog.ready?.();
        return catalog;
      },
    });
  }
}
```

## Events

`ctx.listener(event, handler)` is useful for synchronizing module data with model changes. Adminizer emits `model:updated` after edit controller updates a record.

```ts
ctx.listener("model:updated", async (event: { modelName: string; record: Record<string, any> }, runtime) => {
  if (event.modelName.toLowerCase() !== "category") {
    return;
  }

  const storage = runtime.models.get("MyCatalogStorage");
  await storage.update({ where: { label: "main" } }, { touchedAt: Date.now() } as any);
});
```

`AppManager` also emits lifecycle events such as `app:registered`, `app:enable:start`, `app:enabled`, `app:disable:start`, `app:disabled`, `app:unregistered`, and resource-level registration events.

## Vite Build For App Components

Build module UI as an ES module and externalize Adminizer globals to avoid bundling another copy of React or UI components.

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { viteExternalsPlugin } from "vite-plugin-externals";

export default defineConfig({
  plugins: [
    react(),
    viteExternalsPlugin({
      react: "React",
      "react-dom": "ReactDOM",
      "lucide-react": "LucideReact",
      sonner: "sonner",
      "@/components/ui/button": "UIComponents",
      "@/components/ui/card": "UIComponents",
      "@/components/ui/input": "UIComponents",
      "@/components/ui/label": "UIComponents",
    }),
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, ""),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(import.meta.dirname, "MyAppPage"),
      formats: ["es"],
      fileName: (format) => `MyAppPage.${format}.js`,
    },
    rollupOptions: {
      external: [
        "@/components/ui/button",
        "@/components/ui/card",
        "@/components/ui/input",
        "@/components/ui/label",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "../../src/assets/js"),
    },
  },
});
```

Use project-specific build scripts for modules. The fixture uses:

```bash
npm run build:apps
```

## Fixture Examples

The fixture contains three current app-module examples:

| App | Files | Demonstrates |
|---|---|---|
| `component-b` | `fixture/apps/component-b/*` | Page module, asset registration, UI route, JSON API route, sidebar config patch. |
| `module-manager` | `fixture/apps/module-manager/*` | Access right token, permission-protected page/API routes, app lifecycle control through `AppManager`. |
| `navigation` | `fixture/apps/navigation/*` | Runtime model, model access, catalog factory, catalog template components, sidebar links, `model:updated` listener. |

## Field Controls

Custom form controls are still implemented through `AbstractControls` and `adminizer.controlsHandler`, not through `AppManager` yet. See [Controls.md](Controls.md) for that API.

## Checklist

- App has stable `name` and `version`.
- All registered resources have deterministic `id` values.
- UI controllers render through `req.Inertia.render({ component: "module", props: { moduleComponent, ... } })`.
- API controllers use `mode: "api"` policies and return JSON.
- Frontend assets are registered through `ctx.asset()` with both `filePath` and `devUrl` when local development is needed.
- App-specific models are declared with `ctx.model()` and allowed with `ctx.modelAccess()` before catalogs use them.
- Catalog templates are registered with `ctx.catalogTemplateComponent()` instead of hard-coded paths in catalog data.
- Module UI uses `window.UIComponents`, `window.JSComponents`, `window.adminApi`, and global React/Lucide exports instead of bundling duplicates.
