# Adminizer App Modules

Adminizer modules are backend-first extensions built around `AbstractAdminizerApp` and `AppManager`. A module can register routes, frontend assets, form controls, config patches, access rights, existing ORM models, model access scopes, AI assistants, media managers, catalogs with template components, and event listeners. This is the current extension mechanism for features such as the fixture module pages, AI assistant, media manager, module manager, navigation catalog, and React-Quill control.

Older standalone React page modules may still exist as frontend patterns, but a full Adminizer module should be installed through `adminizer.appManager`.

## App Boundary

An app must not accept, store, or depend on an `Adminizer` instance. The host application owns Adminizer and uses it only to enable the app:

```ts
await adminizer.init(adminpanelConfig);
await adminizer.appManager.enable(new MyApp({
  route: "/my-app",
}));
```

The app constructor accepts only its own configuration and optional app-level dependencies:

```ts
// Correct
new MyApp({ route: "/my-app" });

// Do not do this
new MyApp(adminizer, { route: "/my-app" });
```

This boundary lets `AppManager` control resource ownership, cleanup, model permissions, and the capabilities exposed to each app.

Use the API supplied for each lifecycle phase:

| App code | Access point |
|---|---|
| `setup()` | Register resources through `AppSetupContext`. |
| App controller | Use the app-scoped `req.runtime`. |
| Catalog factory | Use the `runtime` factory argument. |
| Event listener | Use the `runtime` handler argument. |

`req.adminizer` is a deprecated compatibility API. It will not be available starting with Adminizer v6 and must not be used in app code.

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

`AppManager.enable(app)` registers the app if needed, runs `setup(ctx)`, waits for deferred model, model-access, media-manager, and catalog registrations, and stores disposers for later `disable()` or `unregister()`. `setup()` receives only `AppSetupContext`; it does not receive `Adminizer`.

## Resource Registration

`setup(ctx)` receives an `AppSetupContext` with these methods:

| Method | Purpose |
|---|---|
| `ctx.asset(asset)` | Expose a JS/CSS/static file and return its URL. In `ADMINIZER_ENV=dev`, `devUrl` is returned directly. In production, Adminizer creates a static controller for `filePath`. |
| `ctx.control(control)` | Register an app-owned form control with its component asset, optional stylesheet asset, type, name, and base config. |
| `ctx.controller(controller)` | Register an Express route under `config.routePrefix`; returns the resolved full path. |
| `ctx.config(patch, id?)` | Merge a config patch into `adminizer.config`. Arrays of objects with `id` are merged by id; other arrays are appended. |
| `ctx.accessRight(token)` | Register an access rights token owned by the app. |
| `ctx.model(model)` | Attach an existing ORM model to the app. The model must be installed before the app is enabled. |
| `ctx.modelAccess(access)` | Allow the app runtime to access selected models through `runtime.models`. |
| `ctx.aiAssistant(resource)` | Register an app-owned AI assistant handler with model factories. |
| `ctx.skills.agent(skill)` | Register a server-side AI assistant skill (a tool every compatible agent may call). See [Agent Skills](AiAssistant/AgentSkills.md). |
| `ctx.skills.uiMethod(method)` | Register a browser capability an agent may trigger through a `ui.method` frame. See [Admin Links & UI Methods](AiAssistant/AdminLinksAndUiMethods.md). |
| `ctx.adminLink(link)` | Register a standalone admin page in the navigation and in agent link search. |
| `ctx.adminLinkTemplate(template)` | Register a parametrized page (e.g. `/admin/orders/:id/invoice`) the assistant may open. |
| `ctx.mediaManager(resource)` | Register an app-owned media manager through a factory that receives `AppRuntime`. |
| `ctx.catalog(catalog)` | Register a catalog factory and its optional React template components. |
| `ctx.listener(event, handler)` | Subscribe to Adminizer events. The handler receives `(payload, runtime)`. |

Registration order after `setup()` is intentional: app model bindings first, model access second, AI assistants third, assistant UI methods and agent skills fourth, media managers fifth, and catalogs sixth. This lets factories safely use models owned by the same app.

## App Runtime

`AppRuntime` is the public capability object for app code. App controllers receive it through `req.runtime`; media manager factories, catalog factories, and event listeners receive the same app-scoped runtime as an argument.

```ts
interface AppRuntime {
  models: AppModelAccess;
  config: {
    readonly routePrefix: string;
    getModelConfig(modelName: string): ModelConfig | undefined;
  };
  notifications: {
    send(
      notification: Omit<INotification, "id" | "createdAt" | "icon">
    ): Promise<boolean>;
  };
  apps: {
    list(): AppRuntimeApp[];
    get(name: string): AppRuntimeApp | undefined;
    enable(name: string): Promise<void>;
    disable(name: string): Promise<void>;
    unregister(name: string): Promise<void>;
  };
}
```

Use `runtime.models.get<T>(modelName)` only for models declared through `ctx.modelAccess()`. Pass the canonical Adminizer resource name, not a physical ORM host model name. This keeps internal and app model access explicit. Runtime model access returns a trusted repository and does not apply `DataAccessor` user or field filtering, so user-facing controllers should enforce access through policies and module-level checks.

For example, if the project declares `Customer: { model: "User" }`, grant and request `Customer`:

```ts
ctx.modelAccess({ models: ["Customer"] });
const customers = runtime.models.get("Customer");
```

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

For controllers, register model access during setup and read the model through `req.runtime`:

```ts
setup(ctx: AppSetupContext): void {
  ctx.modelAccess({
    id: "users",
    models: ["User"],
  });

  ctx.controller({
    id: "users",
    method: "get",
    route: "/my-app/users",
    middleware: async (req, res) => {
      const users = await req.runtime.models.get<User>("User").find({});
      return res.json({ users });
    },
    policies: [{ type: "auth", mode: "api" }],
  });
}
```

`ControllerHandler` assigns the runtime for the app that registered the controller before its middleware executes. Do not capture `Adminizer` in a controller closure and do not use `req.adminizer`.

## Routes And Policies

`ctx.controller()` registers routes through `ControllerHandler`. The route is automatically prefixed with the configured Adminizer route prefix, which is available to the controller as `req.runtime.config.routePrefix`.

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

## App Models

A module declares ownership of an ORM model by name:

```ts
ctx.model({
  name: "MyAppState",
});

ctx.modelAccess({ models: ["MyAppState"] });
```

`AppManager` does not define tables, register native ORM models, or synchronize schemas. The host or module installer must complete those operations before `appManager.enable()`.

For Sequelize, models can be installed after `adminizer.init()` and immediately before enabling the app:

```ts
await installMyAppSequelizeModels(sequelize);
await adminizer.appManager.enable(new MyApp());
```

Disabling an app removes its Adminizer model wrapper but does not remove the native Sequelize model or its table.

`adapter` is optional. If omitted, Adminizer uses `config.system.defaultORM` or the only registered ORM adapter.

### TypeORM

TypeORM support remains experimental. Core logs a warning whenever an app is enabled while `system.defaultORM` is `typeorm`. A TypeORM entity required by an app must be included in `DataSource.entities` before `dataSource.initialize()`. TypeORM does not support the Sequelize-style dynamic app model installation used by the fixture.

Apps without their own models can still be enabled normally with TypeORM. An app with a model can also be enabled when its entity was registered before initialization. If the entity is missing, `AppManager` fails during `enable()` with an error explaining this requirement.

## AI Assistant Resources

An app can own the active AI assistant handler and model services:

```ts
ctx.accessRight({
  id: "ai-assistant-my-model",
  name: "My assistant model",
  description: "Access to My assistant model",
  department: "AI Assistant",
});

ctx.aiAssistant({
  models: [
    (context) => new MyAiModelService(context),
  ],
});

ctx.config({
  aiAssistant: {
    enabled: true,
    defaultModel: "my-model",
    models: ["my-model"],
  },
});
```

`ctx.aiAssistant()` creates an `AiAssistantHandler` for the app and registers model services returned by its factories. The factory receives an AI context with `runtime`, `routePrefix`, model resource lookup helpers, permission checks, `createDataAccessor()`, and `getUiMethods(user)`. Disabling the app restores the previous handler, removes the app's config layer, and unregisters app-owned access tokens.

Assistant model classes should extend `AbstractAiModelService`, but they should not register access rights themselves. The app owns tokens through `ctx.accessRight()`. Register routes with `ctx.controller()` and the reusable `AiAssistantController` when the app exposes the standard assistant API. The fixture implementation is in `fixture/apps/ai-assistant`.

An app can also contribute capabilities to agents it does not own: server-side tools through `ctx.skills.agent()`, browser capabilities through `ctx.skills.uiMethod()`, and navigable pages through `ctx.adminLink()` / `ctx.adminLinkTemplate()`. All four are removed when the app is disabled. See [AI Assistant](AiAssistant.md) for the full contracts.

## Media Manager Resources

An app can own a media manager implementation:

```ts
ctx.mediaManager({
  factory: (runtime) => new MyMediaManager(runtime, config),
});
```

The manager is created after the app models and scoped model access are registered. Disabling the app unregisters the manager automatically. The app owns its access right, models, model access, and storage implementation.

In Adminizer v5, the media manager HTTP API, upload adapter, thumbnail endpoint, public-file binding, and file icons remain in core for legacy compatibility. A manager registered through `mediaManagerHandler.add()` and a manager registered through `ctx.mediaManager()` use the same core routes. This transport layer is planned to move to the system runtime in v6.

The fixture default implementation is in `fixture/apps/media-manager`. Its Sequelize installer runs after `adminizer.init()` and before `appManager.enable()`. It is intentionally not enabled in the TypeORM fixture: TypeORM remains experimental and app entities must be registered in `DataSource.entities` before `initialize()`.

`AbstractMediaManager` still accepts `Adminizer` in its constructor and registers its access right through `_bindAccessRight()` for the legacy v5 path. Existing integrations may continue to instantiate a custom manager and call `adminizer.mediaManagerHandler.add(manager)` until v6. App-owned managers should register their access right with `ctx.accessRight()` and pass a no-op legacy host to the base constructor; see the fixture implementation and [MediaManager.md](MediaManager.md).

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

A module maps that template `type` to a React component in the `templates` array of `ctx.catalog()`:

```ts
const catalogTemplates = ctx.asset({
  id: "catalog-templates",
  filePath: path.resolve(import.meta.dirname, "CatalogTemplates.es.js"),
  devUrl: "/apps/my-app/CatalogTemplates.tsx",
});

ctx.catalog({
  id: "my-catalog",
  templates: [{
    id: "item-form",
    type: "my-catalog.item-form",
    component: catalogTemplates,
    exportName: "MyCatalogItemTemplate",
  }],
  factory: (runtime) => new MyCatalog(runtime),
});
```

Template components are scoped to the catalog returned by the same resource. `CatalogTemplateComponentHandler` prevents two enabled components from claiming the same template type in that catalog scope.

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

For heavy built-in `window.JSComponents` controls, import Adminizer's lazy proxy modules in development and externalize those imports in production:

```tsx
import HandsonTable from "@/js-components/handsontable";
import MonacoEditor from "@/js-components/monaco";
import VanillaJSONEditor from "@/js-components/jsoneditor";
```

```ts
viteExternalsPlugin({
  "@/js-components/handsontable": ["JSComponents", "HandsonTable"],
  "@/js-components/monaco": ["JSComponents", "MonacoEditor"],
  "@/js-components/jsoneditor": ["JSComponents", "VanillaJSONEditor"],
});
```

Do not import `@/components/handsontable`, `@/components/monaco-editor`, or `@/components/VanillaJSONEditor` directly from app modules when you want lazy loading. Those component imports bypass the control proxy layer that loads the production assets and related styles on demand.

Use project-specific build scripts for modules. The fixture uses:

```bash
npm run build:apps
```

`build:apps` also runs `build:catalog-modules`, which builds the legacy virtual catalog React templates and actions from `fixture/virtual-catalog`.

## Fixture Examples

The fixture contains several current app-module examples:

| App | Files | Demonstrates |
|---|---|---|
| `ai-assistant` | `fixture/apps/ai-assistant/*` | App-owned AI assistant handler, model access tokens, standard AI routes, config layer, and runtime enable/disable through `AppManager`. |
| `notification-sender` | `fixture/apps/notification-sender/*` | Page module, asset registration, scoped model access through `req.runtime.models`, user message notifications, UI/API routes, sidebar config patch. |
| `module-manager` | `fixture/apps/module-manager/*` | Access right token, permission-protected page/API routes, app lifecycle control through `req.runtime.apps`. |
| `navigation` | `fixture/apps/navigation/*` | Runtime model, model access, catalog factory, catalog template components, sidebar links, `model:updated` listener. |
| `media-manager` | `fixture/apps/media-manager/*` | Dynamic Sequelize models, app-owned storage implementation, scoped model access, manager registration, lifecycle cleanup. |
| `quill-editor` | `fixture/apps/quill-editor/*` | App-owned WYSIWYG control, lazy component and stylesheet assets, and a dedicated ES module build. |

## Field Controls

Custom form controls are app-owned resources registered through `ctx.control()`. Their JavaScript and optional stylesheet are loaded only when the field renderer mounts the control. Disabling the app unregisters the control and removes its asset routes. See [Controls.md](Controls.md) for the complete contract, build configuration, field configuration, and fallback behavior.

## Checklist

- App has stable `name` and `version`.
- App constructor accepts app config/dependencies, never an `Adminizer` instance.
- App controllers use `req.runtime`; they do not use the deprecated `req.adminizer`.
- All registered resources have deterministic `id` values.
- UI controllers render through `req.Inertia.render({ component: "module", props: { moduleComponent, ... } })`.
- API controllers use `mode: "api"` policies and return JSON.
- Frontend assets are registered through `ctx.asset()` with both `filePath` and `devUrl` when local development is needed.
- Custom form controls are registered through `ctx.control()` with deterministic component and stylesheet asset IDs.
- App-specific models are declared with `ctx.model()` and allowed with `ctx.modelAccess()` before catalogs use them.
- Catalog templates are registered in `ctx.catalog({ templates: [...] })` instead of hard-coded paths in catalog data.
- Module UI uses `window.UIComponents`, `window.JSComponents`, `window.adminApi`, and global React/Lucide exports instead of bundling duplicates.
