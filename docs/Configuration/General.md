# General Configuration

Adminizer is configured through a single `AdminizerConfig` object. The object describes global settings and the models that should appear in the interface.

```ts
import { AdminizerConfig } from "adminizer";

const config: AdminizerConfig = {
  routePrefix: "/admin",
  auth: true,
  dashboard: true,
  models: {},
};
```

**Key global options**

| Option | Description |
|--------|-------------|
| `routePrefix` | Base URL for the panel. Defaults to `/admin`. |
| `linkAssets` | Symlink static assets instead of copying them. |
| `identifierField` | Default primary key for models (usually `id`). |
| `showORMtime` | Show `createdAt`/`updatedAt` fields in forms. |
| `models` | Object with model definitions. |
| `dashboard` | Enable dashboard widgets. |
| `showVersion` | Display Adminizer version in the sidebar. |

Additional options like `welcome`, `translation` and `administrator` credentials can also be provided.
