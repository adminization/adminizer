# General Configuration

Adminizer is configured through a single `AdminizerConfig` object. The object describes global settings and the models that should appear in the interface.

```ts
import { AdminizerConfig } from "adminizer";

const config: AdminizerConfig = {
  routePrefix: "/admin",
  favicon: "/brand/admin-favicon.ico",
  auth: { enable: true },
  dashboard: true,
  models: {},
};
```

**Key global options**

| Option | Description |
|--------|-------------|
| `routePrefix` | Base URL for the panel. Defaults to `/admin`. |
| `favicon` | Custom favicon URL. Relative values are resolved from `routePrefix`; default is `<routePrefix>/files/favicon.png`. |
| `auth` | Authentication settings, for example `{ enable: true, captcha: true }`. |
| `linkAssets` | Symlink static assets instead of copying them. |
| `identifierField` | Default primary key for models (usually `id`). |
| `showORMtime` | Show `createdAt`/`updatedAt` fields on create/edit pages. |
| `models` | Object with model definitions. |
| `dashboard` | Enable dashboard widgets. |
| `showVersion` | Display Adminizer version in the sidebar. |
| `system.defaultORM` | Adapter that owns the required system models. Sequelize is recommended; TypeORM is experimental. |
| `system.internalModelAccess` | Extend allowlisted internal model access scopes for trusted system modules. |

Additional options like `welcome`, `translation` and `administrator` credentials can also be provided.

## Migrations

Starting with Adminizer 5, built-in migrations are not supported. Projects should manage database schema changes with their own ORM or migration tool. For Sequelize projects, register Adminizer system models and synchronize or migrate them through the host application's database workflow. See [System Models](Models.md).

**`favicon` examples**

```ts
// 1) default behavior (no option):
// /admin/files/favicon.png

// 2) absolute path from host root:
favicon: "/static/admin/favicon.ico"

// 3) relative to routePrefix:
favicon: "files/my-custom-favicon.png" // -> /admin/files/my-custom-favicon.png

// 4) full external URL:
favicon: "https://cdn.example.com/admin/favicon.svg"
```

## Internal Model Access

Adminizer system modules can use `modelHandler.internal(scope)` to access selected internal models without `DataAccessor` user filtering. Built-in scopes cover Adminizer's own modules; projects can add custom scopes through `system.internalModelAccess`.

```ts
const config: AdminizerConfig = {
  routePrefix: "/admin",
  system: {
    internalModelAccess: {
      "my-module": ["User", "Filter"]
    }
  }
};
```

Usage:

```ts
const filters = await adminizer.modelHandler
  .internal("my-module")
  .get("Filter")
  .find({ where: { modelName: "Example" } });
```

Use this only for trusted system-level code. Normal user-facing operations should continue to use model methods with `DataAccessor`.
