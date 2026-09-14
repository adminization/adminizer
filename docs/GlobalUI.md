# Global UI Components

All React UI elements are exported to the global `window.UIComponents` object. This allows external modules compiled with Vite to reference the components without bundling them.

Each UI component from `src/assets/js/components/ui` is available by name. For example, `window.UIComponents.Button` exposes the button component used across the project.

## Using from another project

When building your own module you can mark Adminizer UI components as external dependencies so that they are resolved from the `window.UIComponents` container. A minimal `vite.config.js` looks like this:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteExternalsPlugin } from 'vite-plugin-externals';

export default defineConfig({
  plugins: [
    react(),
    viteExternalsPlugin({
      '@/components/ui/button.tsx': 'UIComponents',
      '@/components/ui/dialog.tsx': 'UIComponents',
    }),
  ],
});
```

In your module you can read components from the global container:

```tsx
const { Button } = window.UIComponents;

export default function Example() {
  return <Button onClick={() => alert('Hi!')}>Click me</Button>;
}
```

Make sure the Adminizer bundle is loaded before your module so that `registerUIComponents()` has populated `window.UIComponents`.

The `registerUIComponents()` function automatically creates `window.UIComponents` if it doesn't already exist. This avoids runtime errors like `Uncaught TypeError: Cannot convert undefined or null to object` when the container is missing.

## Global search

The panel header carries a search palette, opened with `Ctrl/Cmd+K` or its button. It searches the
**navigation registry** — the same server-side list of pages the sidebar and the AI assistant read
(`GET {routePrefix}/api/links/search?q=`), so results are filtered by the user's permissions: a page
someone may not open never appears.

An app page reaches the palette by being registered, not by anything frontend-side:

| Registration | Appears as |
|---|---|
| `ctx.adminLink({id, title, link, …})` | a page, openable from the palette |
| `navbar.additionalLinks` / model config | a page, openable from the palette |
| `ctx.adminLinkTemplate({template: "/x/:id"})` | a search hit, but not yet openable — a parametrized page needs an id |

The palette is also the handler of the assistant's `search-admin-links` browser action
(`adminizer:ai-search-admin-links`): it opens with the agent's query prefilled.

## Built-In Control Globals

`window.JSComponents` also exposes selected built-in controls such as `VanillaJSONEditor`, `HandsonTable`, and `MonacoEditor`.

These exports are lazy proxies. Registering UI globals does not place the control implementations in the main Adminizer bundle and does not download them on dashboard entry. The corresponding ES module and production stylesheet are loaded when the proxy is first rendered.

When app modules need the heavy built-in controls in local development, import Adminizer's lazy proxy modules instead of importing `@/components/...` directly:

```tsx
import HandsonTable from "@/js-components/handsontable";
import MonacoEditor from "@/js-components/monaco";
import VanillaJSONEditor from "@/js-components/jsoneditor";
```

Externalize the same imports in the module Vite config:

```ts
viteExternalsPlugin({
  "@/js-components/handsontable": ["JSComponents", "HandsonTable"],
  "@/js-components/monaco": ["JSComponents", "MonacoEditor"],
  "@/js-components/jsoneditor": ["JSComponents", "VanillaJSONEditor"],
});
```

This keeps development and production behavior aligned: the module loads only a small proxy first, while the control implementation and styles are loaded on first render.

App-owned custom controls should use `ctx.control()` instead of adding new entries to `window.JSComponents`. See [Controls](Controls.md).
