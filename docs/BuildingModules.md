# Building a Module for Adminizer

This guide covers everything you need to create your own React module for an Adminizer-powered project — whether it's a full admin page, a custom field control, or a dashboard widget.

**Related docs:**
- [UIComponents.md](UIComponents.md) — full reference for all components available via `window.UIComponents` and `window.JSComponents`
- [adminizer-module.d.ts](../adminizer-module.d.ts) — TypeScript declarations for globals and module contracts

---

## How the UI layer works

Adminizer registers React components into `window.UIComponents` at startup via `registerUIComponents()`. Your module consumes them at runtime without bundling its own copy.

This means:
- consistent look & feel with the core UI;
- no duplicate React / shadcn / Radix in your bundle;
- dark/light theme and spacing handled automatically.

See [UIComponents.md](UIComponents.md) for the full list of available components and their props.

---

## Types of modules

| Type | Loaded by | Default export receives |
|---|---|---|
| **Page module** | `module.tsx` (full-page Inertia route) | `{ data?: TData }` |
| **Field control** | `DynamicControls` (inside a form field) | `{ initialValue, onChange, name, options }` |

---

## 1. Page module

A page module is a standalone React component rendered as a full admin page.

```tsx
// my-page-module.tsx
import type { PageModuleProps } from 'adminizer/adminizer-module';

interface Item { id: number; name: string; status: string }

export default function MyPageModule({ data }: PageModuleProps<{ items: Item[] }>) {
  const { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
          Badge, Toaster } = window.UIComponents;
  const { items = [] } = data ?? {};
  const [loading, setLoading] = React.useState(false);

  const handleAction = async (id: number) => {
    setLoading(true);
    try {
      await window.adminApi.postJson(`${window.routePrefix}/api/my-resource/${id}/action`);
      window.sonner.toast.success('Done');
    } catch {
      window.sonner.toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster richColors position="bottom-right" />
      <Table wrapperHeight="max-h-[70vh]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
              <TableCell>
                <Button size="sm" disabled={loading} onClick={() => handleAction(item.id)}>
                  Run
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
```

**Backend registration (route + Inertia render):**

```ts
// Pass data and JS path to the frontend
res.render('module', {
  moduleComponent: `${routePrefix}/modules/my-page/my-page-module.js`,
  data: { items: await fetchItems() },
});
```

---

## 2. Field control module

A field control replaces the default input for a specific field type (wysiwyg, codeEditor, jsonEditor, etc.).

### 2.1 Frontend component

```tsx
// my-editor.tsx
import type { FieldModuleProps } from 'adminizer/adminizer-module';

export default function MyEditor({ initialValue, onChange, name, options }: FieldModuleProps) {
  const { MonacoEditor } = window.JSComponents;

  return (
    <MonacoEditor
      value={initialValue}
      onChange={onChange}
      options={{ language: options?.language ?? 'javascript' }}
    />
  );
}
```

Props received from `DynamicControls`:

| Prop | Type | Description |
|---|---|---|
| `initialValue` | `string` | Current field value |
| `onChange` | `(value: string) => void` | Emit new value to the form |
| `name` | `string` | HTML field name attribute |
| `options` | `Record<string, string>` | Config from `AbstractControls.getConfig()` merged with per-field overrides |

### 2.2 Backend control class

```ts
import { AbstractControls, ControlType, Path, Config, Adminizer } from 'adminizer';

export class MyEditor extends AbstractControls {
  readonly name = 'my-editor';
  readonly type: ControlType = 'codeEditor';
  readonly path: Path = {
    jsPath: {
      dev:        `${this.routPrefix}/modules/my-editor/my-editor.js`,
      production: `${this.routPrefix}/modules/my-editor/my-editor.prod.js`,
    },
    cssPath: '',
  };
  readonly config: Config = { language: 'javascript' };

  constructor(adminizer: Adminizer) { super(adminizer); }

  getName()    { return this.name; }
  getConfig()  { return this.config; }
  getJsPath()  { return process.env.ADMINIZER_ENV === 'dev' ? this.path.jsPath.dev : this.path.jsPath.production; }
  getCssPath() { return this.path.cssPath || undefined; }
}
```

Available `type` values: `wysiwyg` | `jsonEditor` | `geoJson` | `markdown` | `table` | `codeEditor`

### 2.3 Register and use

**Register on `adminizer:loaded`:**

```ts
adminizer.emitter.on('adminizer:loaded', () => {
  adminizer.controlsHandler.add(new MyEditor(adminizer));
});
```

**Reference in model field config:**

```ts
fields: {
  body: {
    title: 'Body',
    type: 'codeEditor',
    options: {
      name: 'my-editor',          // matches AbstractControls.name
      config: { language: 'sql' } // overrides control defaults
    }
  }
}
```

---

## 3. Building with Vite

Your module must be built as an ES module with Adminizer's globals as externals — otherwise React and UI components will be duplicated in the bundle.

```ts
// vite.config.module.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteExternalsPlugin } from 'vite-plugin-externals';

export default defineConfig({
  plugins: [
    react(),
    viteExternalsPlugin({
      'react':     'React',
      'react-dom': 'ReactDOM',
      // Optional, only if your external module imports `axios` directly.
      // Adminizer exposes `window.axios` as a legacy compatibility client.
      // Prefer `window.adminApi` for new code.
      'axios':     'axios',
      'sonner':    'sonner',
    }),
  ],
  build: {
    lib: {
      entry:    'src/my-module.tsx',
      formats:  ['es'],
      fileName: 'my-module',
    },
    rollupOptions: {
      // Keep UIComponents and JSComponents external too
      // if you import them as bare specifiers in your module
    },
  },
});
```

The output is a small `.js` file that reads globals from the Adminizer page at runtime.

---

## 4. TypeScript setup

Add the Adminizer module declarations to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  },
  "include": [
    "src",
    "node_modules/adminizer/adminizer-module.d.ts"
  ]
}
```

This gives you:
- autocomplete and hover docs for `window.UIComponents.*`, `window.JSComponents.*`, `window.adminApi`, `window.sonner`
- `PageModuleProps<T>` and `FieldModuleProps` types for your component signatures

---

## 5. Using UI components

Destructure from `window.UIComponents` at the top of your component. All components follow the same API as documented in [UIComponents.md](UIComponents.md).

```tsx
const {
  Button, Badge, Card, CardHeader, CardTitle, CardContent,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
  Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Toaster,
} = window.UIComponents;

const { MultiSelect, MonacoEditor } = window.JSComponents;
const { Pencil, Trash2, Plus } = window.LucideReact;
```

**Key rules:**
- Never `import` shadcn, Radix, or Lucide directly — use the globals above.
- Wrap your root with `<Toaster />` once if you use `window.sonner.toast`.
- Wrap with `<TooltipProvider>` once if you use `<Tooltip>`.
- Use `window.adminApi` instead of legacy `window.axios` for API calls. Prefer `*Json` methods for JSON endpoints — they add no-cache headers and throw a readable error if the session expires.

---

## 6. HTTP calls

```ts
// Preferred — typed, no-cache, throws on HTML responses (session expiry)
const { data } = await window.adminApi.getJson<{ rows: Row[] }>(
  `${window.routePrefix}/api/my-resource`
);

await window.adminApi.postJson(`${window.routePrefix}/api/my-resource`, { name: 'New' });
await window.adminApi.putJson(`${window.routePrefix}/api/my-resource/${id}`, payload);
await window.adminApi.patchJson(`${window.routePrefix}/api/my-resource/${id}`, patch);
await window.adminApi.deleteJson(`${window.routePrefix}/api/my-resource/${id}`);
```

Always use `window.routePrefix` to build URLs — it holds the configured admin prefix (e.g. `/admin`).

---

## 7. Notifications (toasts)

```ts
window.sonner.toast('Record saved');
window.sonner.toast.success('Created successfully');
window.sonner.toast.error('Something went wrong');
window.sonner.toast.warning('Deprecated field');
window.sonner.toast.promise(
  window.adminApi.postJson('/admin/api/items', payload),
  { loading: 'Saving...', success: 'Saved', error: 'Failed' }
);
```

---

## 8. Navigation links and the Inertia popup problem

Adminizer uses [Inertia.js](https://inertiajs.com/) for SPA navigation. The sidebar's `<Link>` component intercepts clicks and performs an XHR fetch to the target URL expecting an Inertia JSON response.

**If the link target is NOT an Inertia endpoint, a popup modal appears and then the page does a full reload.**

This happens because Inertia receives an HTML page instead of the expected JSON response and falls back to a hard redirect, which briefly shows an error popup.

### When does this occur?

- The link uses a **relative path** that resolves to the wrong URL (e.g. `/integrations` instead of `/dashboard/integrations`).
- The target route **does not call `req.Inertia.render()`** — for example it returns plain JSON or redirects.
- The link points to an **external URL** or a route outside the adminizer prefix.

### How to fix

**1. Always use full paths with the `routePrefix`:**

```ts
// ❌ Wrong — resolves to /integrations, not an Inertia route
link: '/integrations'

// ✅ Correct — matches the registered Inertia route
link: '/dashboard/integrations'
```

**2. For hash-based navigation (SPA sub-pages), use `<a>` instead of Inertia `<Link>`:**

Inertia's `<Link>` does not understand hash-only URLs. If you navigate to `/dashboard/integrations#edit/123`, Inertia will fetch `/dashboard/integrations#edit/123` as a new page request, ignoring the hash.

Use a native `<a>` tag for URLs that contain a `#`:

```tsx
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    if (href.includes('#')) return <a href={href}>{children}</a>; // full reload, keeps hash
    return <Link href={href}>{children}</Link>;                   // Inertia SPA navigation
}
```

**3. Ensure every custom route renders via Inertia:**

```ts
// ✅ Required — Inertia.render() returns the correct JSON envelope
handler: async (req, res) => {
    return req.Inertia.render({ component: 'module', props: { ... } });
}

// ❌ Wrong — plain res.json() triggers the popup
handler: async (req, res) => {
    return res.json({ data: items });
}
```

Note: API routes that return JSON (e.g. `?_method=getItems`) must be handled **before** the Inertia render branch in the same handler, not as separate routes, to avoid Inertia intercepting them.

---

## 9. Deployment checklist

- [ ] Bundle contains no duplicated React / shadcn / Radix libs (check with `vite-bundle-visualizer`).
- [ ] All UI elements come from `window.UIComponents` / `window.JSComponents`.
- [ ] `loading`, `error`, and `success` states are handled for every async action.
- [ ] `dev` and `production` paths in `AbstractControls.path` point to the correct built assets.
- [ ] Control is registered inside the `adminizer:loaded` listener.
- [ ] Model field references the control via `options.name`.
- [ ] TypeScript declarations included via `node_modules/adminizer/adminizer-module.d.ts`.
