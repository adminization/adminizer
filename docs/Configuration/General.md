# General Configuration

Adminizer is configured through a single `AdminizerConfig` object. The object describes global settings and the models that should appear in the interface.

```ts
import { AdminizerConfig } from "adminizer";

const config: AdminizerConfig = {
  routePrefix: "/admin",
  favicon: "/brand/admin-favicon.ico",
  auth: true,
  dashboard: true,
  models: {},
};
```

**Key global options**

| Option | Description |
|--------|-------------|
| `routePrefix` | Base URL for the panel. Defaults to `/admin`. |
| `favicon` | Custom favicon URL. Relative values are resolved from `routePrefix`; default is `<routePrefix>/files/favicon.png`. |
| `linkAssets` | Symlink static assets instead of copying them. |
| `identifierField` | Default primary key for models (usually `id`). |
| `showORMtime` | Show `createdAt`/`updatedAt` fields in forms. |
| `models` | Object with model definitions. |
| `dashboard` | Enable dashboard widgets. |
| `showVersion` | Display Adminizer version in the sidebar. |

Additional options like `welcome`, `translation` and `administrator` credentials can also be provided.

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
