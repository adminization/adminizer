# Layout Contexts

A **layout context** is a part of the admin panel that lives under its own URL prefix, with its own
menu and, optionally, its own layout. The panel itself is the built-in **default context**; apps and
the host add more. Once a user may enter more than one context, the brand menu at the top of the
sidebar turns into a **context switcher**.

Typical uses:

* a "System" area with its own short menu, keeping the panel's layout with a couple of parts changed;
* a "Support desk" with its own sidebar next to the stock header;
* a "Studio" with a shell of its own — a top bar, no sidebar at all.

The feature is **opt-in**: a panel without registered contexts looks and behaves exactly as before.
Its pages only receive two extra shared props, `adminContext` and `adminContexts`; the menu and the
layout are the stock ones, and no switcher is shown.

---

## Enabling the feature

### 1. Register a context

An app registers its context in `setup()`; the context lives as long as the app is enabled.

```ts
import path from "path";
import {AbstractAdminizerApp, AppAsset, AppSetupContext} from "adminizer";

const asset = (id: string, name: string): AppAsset => ({
    id,
    filePath: path.resolve(import.meta.dirname, `${name}.es.js`),
    devUrl: `/apps/support/${name}.tsx`,
});

export class SupportApp extends AbstractAdminizerApp {
    readonly name = "support";
    readonly version = "1.0.0";

    setup(ctx: AppSetupContext): void {
        const support = ctx.context({
            id: "support",
            title: "Support desk",
            icon: "support_agent",
            prefix: "/support",
            accessRightsToken: "context-support",
            layout: {module: asset("layout", "SupportLayout")},
        });
        // ...pages, step 2
    }
}
```

### 2. Add its pages

`page()` registers a route under the context prefix, a menu item and breadcrumbs in one call:

```ts
const page = asset("page", "SupportPage");

support.page({id: "inbox", title: "Inbox", icon: "inbox", path: "", component: page});
support.page({id: "tickets", title: "Open tickets", path: "/tickets", badge: 7, component: page});
```

### 3. Write the layout module

The module exports the parts of the layout it replaces — here the sidebar; everything else stays
stock:

```tsx
// SupportLayout.tsx
import {Link} from "@inertiajs/react";
import {Sidebar as UISidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem} from "@/components/ui/sidebar";
import {ContextSwitcher, type SlotProps, useAdminContext} from "@/shell";

export function Sidebar(_: SlotProps) {
    const {menu, isActive} = useAdminContext();
    return (
        <UISidebar collapsible="icon" variant="inset">
            <SidebarHeader><ContextSwitcher side="right"/></SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {menu.map((item) => (
                        <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton asChild isActive={isActive(item.link)}>
                                <Link href={item.link}>{item.title}</Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
        </UISidebar>
    );
}
```

Build it as an ES module with `@/shell` mapped to `window.AdminizerShell`, see [Vite build](#vite-build).
That is all: users holding `context-support` get the switcher, and `/support` opens with its own
sidebar and menu.

---

## How it works

### What a context decides

Every page request belongs to exactly one context, and the context decides three things:

* **the menu** — the `menu` and `menuSections` shared props are built from the context's navbar;
* **the layout** — the shell drawn around the page (`adminContext.layout`);
* **access** — for pages declared to belong to the context, only users who may enter it get through.

### How a page gets its context

`ContextHandler` (`adminizer.contextHandler`) applies four rules, the first match wins:

1. **A declared page** renders in the context it is declared to belong to, wherever the user came
   from. See [Pages declaring their context](#pages-declaring-their-context).
2. **A URL under a context prefix** belongs to that context. Nested prefixes (`/ops` and
   `/ops/deep`) resolve to the longest one. Prefixes match whole path segments: `/studiox` is not
   inside `/studio`.
3. **Any other URL** — the built-in `/model/...` pages, for one — stays in the context the user came
   from, as long as that context's navbar links to the URL or to a parent path of it. The context
   the user came from is kept in the `adminizer_context` cookie.
4. Everything else belongs to the **default context**.

Under rules 2 and 3 a context the user may not enter is never resolved — the request falls back to
the default context. Under rule 1 the page is blocked instead.

### A request, end to end

```text
GET {routePrefix}/model/JsonSchema
  ↓ bindInertia              the user, shared props (context-related ones are lazy)
  ↓ contextHandler.guard()   declared to "system"? no access → login / 403 / 404
  ↓ route policies           auth, model tokens — as for any page
  ↓ controller               renders the page
  ↓ Inertia render           adminContext, adminContexts, menu, menuSections are computed,
                             once; the visit is remembered in the cookie
  → browser                  ContextLayoutHost loads the context's layout modules and draws the shell
```

Two properties fall out of that order:

* **Context props cost nothing outside page renders.** API calls never compute them, and a partial
  reload computes only the props it asks for.
* **A blocked page never runs its handler**, whatever the method: the guard answers before the route.

### The context cookie

The context of a page visit is remembered in the `adminizer_context` cookie (HttpOnly,
`SameSite=Lax`, path `routePrefix`). It is written only:

* when a page is rendered for a `GET` page visit — an Inertia request or a request accepting
  `text/html` — never for API calls, asset requests or form submissions;
* when the user may enter more than one context;
* when the context changes.

The cookie only matters for undeclared URLs outside every context prefix (rule 3). An unknown or
stale value is ignored.

---

## Registering a context

### From an app

`ctx.context(resource)` registers the context and returns its scope (`id`, `page()`, `controller()`,
`menuItem()`, see [Pages of a context](#pages-of-a-context)). Layout modules and page components
are app assets (`AppAsset`), as in `ctx.asset()`: `filePath` is served in production, `devUrl` is
used with `ADMINIZER_ENV=dev`. An asset used by several pages — of one context or of several — is
registered once. The context, its pages and its routes are removed when the app is disabled or
unregistered.

One app may register several contexts.

### From the host

The host registers on the handler directly; `register()` returns the same scope, and the pages it
adds are the host's controllers (owner `host`). Layout modules and page components are URLs,
registered through the same asset handler apps use:

```ts
const host = (asset: AppAsset) => adminizer.assetHandler.register("host", asset);

adminizer.accessRightsHelper.registerToken({
    id: "context-reports", name: "Reports", description: "Access to the Reports context", department: "Contexts",
});

const reports = adminizer.contextHandler.register({
    id: "reports",
    title: "Reports",
    icon: "bar_chart",
    prefix: "/reports",
    home: "/reports/summary",
    accessRightsToken: "context-reports",
    layout: {
        module: host({id: "reports-overrides", filePath: path.resolve(import.meta.dirname, "ReportsShellOverrides.es.js")}),
        stylesheet: host({id: "reports-css", filePath: path.resolve(import.meta.dirname, "ReportsShellOverrides.css")}),
    },
    navbar: {sections: {Reports: {icon: "bar_chart", order: 1}}},
});

const page = host({id: "reports-page", filePath: path.resolve(import.meta.dirname, "ReportsPage.es.js")});
reports.page({id: "summary", title: "Summary", icon: "summarize", path: "/summary", component: page});

// Later, if needed:
adminizer.contextHandler.unregister("reports");
```

The token is given once — to the context. Its pages need no permission policy of their own: they
belong to the context, and the context token is checked for them.

### Context options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `id` | `string` | required | Unique id. `default` is reserved for the built-in context. |
| `title` | `string` | required | Shown in the switcher and as the default navbar section. Translated through i18n. |
| `icon` | `string` | `rocket_launch` in the switcher | Material icon name. |
| `prefix` | `string` | required | Path below `routePrefix`, e.g. `/support`. A missing leading slash is added, trailing slashes are removed. |
| `home` | `string` | the prefix | Where the switcher leads, as a path below `routePrefix`. |
| `layout` | see [Layouts](#layouts) | `"inherit"` | The shell drawn around the context's pages. |
| `navbar` | `"inherit"` or `{ items?, sections? }` | inherited | The context's menu, see [Navbar](#navbar). |
| `accessRightsToken` | `string` | none | Users without the token neither see nor enter the context, and may not open its declared pages. |
| `switcher` | `boolean` | `true` | `false` keeps the context out of the switcher; its URLs still resolve to it. |

`register()` throws when `id` or `title` is empty, `id` is `default` or already registered, or
`prefix` is empty or already used by another context.

---

## Pages of a context

### `page()`

`page(page)` registers a route at `prefix + path`, appends a menu item to the context's navbar and
returns that item (`HrefConfig`; its `link` is the full path, `routePrefix` included). The route is
declared to belong to the context: it renders in it, and users who may not enter the context get
403.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `id` | `string` | required | Unique within the context; also the id of the menu item. |
| `path` | `string` | required | Path below the context prefix. `""` is the prefix itself. |
| `title` | `string` | required | Menu item, page title and last breadcrumb. Translated through i18n. |
| `icon` | `string` | none | Material icon of the menu item. |
| `component` | URL, or `AppAsset` in apps | — | ES module whose default export renders the page. |
| `props` | object or `(req) => object` | `{}` | Props of `component`, computed per request if a function. |
| `middleware` | `MiddlewareType` | — | A handler of its own instead of `component`. Exactly one of the two is required. |
| `method` | `AppControllerMethod` | `"get"` | HTTP method. |
| `policies` | `AppControllerPolicy[]` | `auth` | Route policies. `[]` leaves only the context token. |
| `menu` | `boolean` | see below | Add a menu item. |
| `section`, `badge`, `accessRightsToken` | | none | Passed to the menu item. |

A `component` page is rendered as the `module` page with:

* `title` — `"<page> · <context>"`;
* `breadcrumbs` — `<context> › <page>`, the first crumb linking to the context prefix;
* everything from `props`, which wins over the two above.

### `controller()` and `menuItem()`

`controller(controller)` registers a route at `prefix + path` that belongs to the context but has no
menu item — an API of the context, a form handler — and returns its full path. It takes the options
of `ctx.controller()` with `path` instead of `route`; its default policy is `auth` (`ui` mode for
`get`, `api` otherwise).

```ts
support.controller({id: "reply", method: "post", path: "/tickets/:id/reply", middleware: replyHandler});
```

`menuItem(item)` appends any `HrefConfig` to the context's navbar — a link to a built-in page, or a
group whose `subItems` are pages added with `menu: false`:

```ts
const daily = reports.page({id: "daily", title: "Daily sales", path: "/sales/daily", menu: false, component: page});
const monthly = reports.page({id: "monthly", title: "Monthly sales", path: "/sales/monthly", menu: false, component: page});
reports.menuItem({id: "sales", title: "Sales", icon: "payments", link: daily.link, type: "self", subItems: [daily, monthly]});
```

### Which menu the items go to

| `navbar` | `page()` and `menuItem()` |
|---|---|
| left out | The context shows the default menu until the first item is added; from then on the menu is its own. |
| `{ items?, sections? }` | Items are appended after `items`. |
| `"inherit"` | `page()` adds no item; `menu: true` and `menuItem()` throw. |

Pages are optional. A context may as well be filled with routes registered elsewhere and
`navbar.items` given at registration, as long as their URLs start with the prefix — such routes
belong to the context by rule 2, without the access check of declared pages.

---

## Navbar

`navbar.items` is a list of `HrefConfig`, the shape of `config.navbar.additionalLinks`: `id`,
`title`, `link`, `type`, `icon`, `section`, `badge`, `accessRightsToken`, `subItems`.

* `link` is a full path, `routePrefix` included; `page()` and `ctx.controller()` return one.
* An item without tokens is shown to everyone. Otherwise it is shown when the user holds its
  `accessRightsToken` or the token of one of its sub-items; sub-items the user may not open are
  removed.
* Items leading to a declared page the user may not open are removed as well.
* Items without a `section` are grouped under the context title. `navbar.sections` sets the icon and
  order of section headers, as `config.navbar.sections` does for the default context.
* The stock menu highlights only the item with the most specific link matching the URL, so a context
  home at the prefix itself is not highlighted on the other pages of the context.

### Built-in pages in a context menu

A context menu may link to built-in pages:

```ts
system.menuItem({
    id: "categories", title: "Categories", icon: "category",
    link: `${routePrefix}/model/Category`, type: "self", section: "Data",
    accessRightsToken: "read-Category-model",
});
```

Opened from this context, `/model/Category` is drawn in the context's layout with its menu — and so
is every URL below it (`/add`, `/edit/:id`), so create and edit flows stay inside the context.
Opening a page the context menu does not link to returns the user to the default context.

This follows the **user**, not the page (rule 3): in a second tab, from a bookmark or from a link a
colleague sent, the same URL may open in another context. To pin a page to one context, declare it.

---

## Pages declaring their context

A page may declare the context it belongs to. A declared page always renders in its context, and
only users who may enter that context may open it. Pages that declare nothing behave as described
above — declaring is opt-in per page.

### Where a context is declared

| Where | How | Covers |
|---|---|---|
| A route of an app or of the host | `context: "support"` in `ctx.controller()` or `controllerHandler.register()`; `page()` and `controller()` of a scope set it | That route exactly; `:params` match one segment. |
| The pages of a model | `context: "system"` in the model config | `/model/<name>` and everything below it: list, add, edit, view, filters, export, inline edit. |
| Anything else — catalogs, custom routes | `adminizer.contextHandler.assign(path, contextId, {exact?})` | `path` and everything below it, or exactly `path`. Returns a function removing the declaration. |

```ts
// adminizer config
models: {
    JsonSchema: {
        title: "Json schema",
        model: "jsonschema",
        context: "system",
    },
}
```

The most specific declaration wins: a route declared to `system` inside a path assigned to `support`
belongs to `system`. A visit to a declared page is remembered in the cookie like any other, so the
undeclared built-in pages opened from it stay in its context.

### Blocking

A declared page the user may not open is answered before any handler, for every method, API calls
included:

| Case | Answer |
|---|---|
| Not logged in | The login page, as with the `auth` policy; 401 for API calls. |
| No context token | 403. |
| The context is not registered — a typo, a disabled app | 404 for everyone, and an error in the log once per context. |
| `auth.enable: false` | Passes, as every policy does. |

Pages are told from API calls by the request: an Inertia request or one accepting `text/html` gets
the page answers (login redirect, `403`), anything else gets JSON.

Login, logout, registration (`/model/<name>/login`, `/logout`, `/register`) and the first-user setup
(`/init_user`) never belong to a context, so declaring a context on the `User` model cannot lock
anyone out.

### Before declaring a context

* **Declaring a context on a model is a breaking change** for users without the context token: every
  `/model/<name>/...` route answers 403 for them, including those other screens use — related-record
  dialogs, catalogs, saved filters, CKEditor uploads. The "create" button of a relation field is
  hidden for them.
* Links to blocked pages are removed from the default menu, context menus, global search and the AI
  assistant's link search and templates.
* A default-menu item leading to a declared model switches the shell to the model's context. A model
  that should live in several contexts does not declare one.
* A context that may disappear makes the pages declared to it answer 404 while it is gone. Routes and
  models of the app that owns the context go away together with it; a host model declaring an app's
  context does not.

---

## Layouts

`layout` is one of:

| Value | Shell |
|---|---|
| `"inherit"` | The default context's layout, with its overrides. The default for every context; for the default context itself, the stock layout. |
| `"stock"` | The stock sidebar and header, without any override. |
| `"none"` | No shell: the page fills the window. |
| `{ module, stylesheet?, base? }` | The inherited layout with some of its parts — or the whole of it — replaced by the module's named exports. `base: "stock"` applies the module over the stock layout instead of the inherited one. |

Module and stylesheet references are URLs when the host registers the context, and `AppAsset`s in
`ctx.context()`.

Some things are shared by every layout, the default one included: the notification, AI assistant and
relation dialog providers, the assistant viewport, the Toaster and the saved light or dark theme.
Switching between contexts is an ordinary Inertia visit, and none of these is re-created.

### Overriding parts of the layout

`layout.module` points to an ES module whose **named exports** replace parts (slots) of the layout.
Parts the module does not export stay as they are.

| Slot | Part | Props |
|---|---|---|
| `Layout` | The whole layout. | `children`, `breadcrumbs`, `className`, `context` |
| `Sidebar` | The whole sidebar. | — |
| `SidebarHeader` | Content of the sidebar header: the context switcher or the brand menu. | — |
| `SidebarContent` | Content of the sidebar body: the menu (`NavMain`). | — |
| `SidebarFooter` | Content of the sidebar footer: version and feedback. | — |
| `Header` | The whole header. | `breadcrumbs` |
| `HeaderStart` | Left part of the header: sidebar toggle and breadcrumbs. | `breadcrumbs` |
| `HeaderActions` | Right part of the header: search, assistant, docs, history, theme, notifications, user menu. | `breadcrumbs` |

`SidebarHeader`, `SidebarContent` and `SidebarFooter` replace the content of their section; the
section element itself (spacing, collapse behaviour) stays. The same goes for `HeaderStart` and
`HeaderActions` inside the stock header. `Layout`, `Sidebar` and `Header` replace the element as a
whole, and the slots inside it are then not used unless the override renders `Default` or stock
parts that contain them (`DefaultLayout`, `AppSidebar`, `AppSidebarHeader`).

Every override receives the slot's props plus `Default` — the part it replaces. Render `Default` to
wrap or extend the part instead of rewriting it:

```tsx
// SystemShellOverrides.tsx
import {Link} from "@inertiajs/react";
import {MaterialIcon, type SlotProps, useAdminContext} from "@/shell";

// An extra button before the inherited header actions.
export function HeaderActions({Default, ...props}: SlotProps) {
    const {context} = useAdminContext();
    return (
        <>
            <Link href={`${context?.prefix}/settings`}><MaterialIcon name="tune"/> Settings</Link>
            <Default {...props}/>
        </>
    );
}

// A note under the inherited footer.
export function SidebarFooter({Default}: SlotProps) {
    return (
        <>
            <Default/>
            <div style={{textAlign: "center", fontSize: 11}}>System context</div>
        </>
    );
}
```

### Inheritance

Layers stack along the chain: the default context's layers (see [The default context](#the-default-context))
apply first, the context's own module on top of them. In a context override, `Default` is the part
as the default context draws it, which is not necessarily the stock part. In the fixture the host
adds a badge to the default sidebar footer, and System appends a note to it: System's footer shows
the badge, the stock version line and the note.

| Context `layout` | Layers applied |
|---|---|
| `"inherit"` or left out | The default context's, over its root. |
| `{ module }` | The default context's, then the context's own. |
| `{ module, base: "stock" }` | Only the context's own, over the stock layout. |
| `"stock"` | None: the clean stock layout. |
| `"none"` | None, and no shell. |

The rule holds whatever the default context is. If it replaces the whole layout (`Layout`), a
context module overriding `SidebarFooter` applies wherever that layout draws the stock sidebar.

### Writing a whole layout

Export `Layout` from the module. It receives:

| Prop | Meaning |
|---|---|
| `children` | The page. |
| `breadcrumbs` | Breadcrumbs given by the page, or the server-generated ones. |
| `className` | Class name passed by the page. |
| `context` | The current context (`AdminContextInfo`). |
| `Default` | The layout it replaces; render it to wrap the inherited layout. |

Use `base: "stock"` when none of the default context's layers should apply.

```tsx
// StudioLayout.tsx
import {Link, usePage} from "@inertiajs/react";
import {type LayoutProps, useAdminContext} from "@/shell";

export function Layout({children}: LayoutProps) {
    const {logout, logoutBtn} = usePage<any>().props;
    const {context, contexts, menu, isActive, switchTo} = useAdminContext();
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100svh"}}>
            <header>
                {menu.map((item) => (
                    <Link key={item.id} href={item.link} style={{fontWeight: isActive(item.link) ? 700 : 400}}>{item.title}</Link>
                ))}
                <select value={context?.id} onChange={(event) => switchTo(event.target.value)}>
                    {contexts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
                <a href={logout}>{logoutBtn}</a>
            </header>
            <main data-scroll-region="content" style={{flex: 1, minHeight: 0, overflowY: "auto"}}>{children}</main>
        </div>
    );
}
```

`NavUser` and `AppSidebarHeader` need `AppShell` around them, so a layout without it draws the user
name and the logout link (`logout`, `logoutBtn` props) on its own.

### Reusing stock parts

The stock shell parts are published as `window.AdminizerShell`. Import them from `@/shell` and map
that import to the global in the Vite build:

| Export | What it is |
|---|---|
| `useAdminContext()` | The context of the page, see [Frontend API](#frontend-api). |
| `AppShell` | Sidebar state provider and frame; required by every `Sidebar*` component, `AppSidebarHeader` and `NavUser`. |
| `DefaultLayout` | The whole stock layout (sidebar + header). |
| `AppSidebar` | The stock sidebar with the context menu. |
| `AppSidebarHeader` | The stock header. |
| `ContextSwitcher` | The context switcher dropdown; works with or without `AppShell`. Prop `side`: `"bottom"` (default) or `"right"`; on mobile it always opens downwards. |
| `NavMain` | The stock menu renderer. |
| `NavUser`, `UserInfo`, `UserMenuContent` | User menu parts. |
| `Breadcrumbs`, `GlobalSearch`, `ThemeSwitcher`, `MaterialIcon` | Individual header parts. |

Types: `SlotProps<P>` (an override's props, `Default` included), `LayoutProps`, `ShellSlotName`,
`AdminContextInfo`, `AdminContextLayer`.

The `Sidebar*` primitives come from `window.UIComponents` (`@/components/ui/sidebar`), see
[Global UI Components](GlobalUI.md).

### Loading and errors

The page is shown once every module of the context has loaded. On the first visit to a context a
spinner is shown meanwhile; later the modules come from the cache and switching is instant.
Stylesheets are added to `<head>` once.

* **A module that fails to load** is skipped and the error is logged to the console. Its parts fall
  back to the parent's version and the other layers still apply; a context whose only module failed
  gets the stock layout.
* **An override that throws while rendering** is replaced by the part it overrides (its `Default`),
  and the error is logged to the console. The rest of the page keeps working.
* **A layout the browser does not recognize** is drawn as the stock layout.

A context stylesheet loads after the panel's, so its rules win over Tailwind utilities of the same
specificity: `display: flex` on a class beats `group-data-[state=collapsed]:hidden` on the same
element. Hide such elements in the collapsed sidebar with a rule of your own, e.g.
`[data-state="collapsed"] .my-filter { display: none; }`.

### Vite build

Build a layout module like any app component (see
[App Modules](BuildingModules.md#vite-build-for-app-components)) and add `@/shell` to the externals:

```ts
const externals = {
    react: "React",
    "react-dom": "ReactDOM",
    "@inertiajs/react": "InertiajsReact",
    "@/components/ui/sidebar": "UIComponents",
    "@/shell": "AdminizerShell",
};

export default defineConfig({
    plugins: [react(), viteExternalsPlugin(externals)],
    build: {
        lib: {entry: "SupportLayout", formats: ["es"], fileName: (format) => `SupportLayout.${format}.js`},
        rollupOptions: {
            external: Object.keys(externals).filter((name) => name.startsWith("@/")),
        },
    },
    resolve: {alias: {"@": path.resolve(import.meta.dirname, "<adminizer>/src/assets/js")}},
});
```

---

## The default context

The built-in context has the id `default` and covers every URL no other context claims. Its title is
the brand title, its prefix the root of `routePrefix`. It cannot be unregistered or disabled:
`configureDefault({switcher: false})` only removes it from the switcher.

The host changes its title, icon, home, layout, navbar or switcher visibility with
`configureDefault()`; repeated calls are merged. Contexts with an inherited layout or menu inherit
these changes.

```ts
// A part of the default layout overridden; contexts inheriting the layout get it too.
const module = adminizer.assetHandler.register("host", {
    id: "default-shell-overrides",
    filePath: path.resolve(import.meta.dirname, "DefaultShellOverrides.es.js"),
    devUrl: "/fixture/apps/contexts/DefaultShellOverrides.tsx",
});
adminizer.contextHandler.configureDefault({layout: {module}});
```

```ts
// The whole default layout and menu replaced.
adminizer.contextHandler.configureDefault({
    title: "Back office",
    icon: "home",
    layout: {module: "/static/BackOfficeLayout.es.js"},   // exports `Layout`
    navbar: {
        items: [{id: "orders", title: "Orders", link: "/admin/model/Order", type: "self", icon: "receipt"}],
        sections: {Sales: {icon: "sell", order: 1}},
    },
});
```

A replaced navbar replaces the menu built from `config.navbar` and app links.

---

## Access rights

* A context with an `accessRightsToken` is hidden from the switcher for users without the token. Its
  prefix resolves to the default context for them, so they get neither its menu nor its layout.
* **For declared pages the context token is an access check**: users without it get 403. Pages added
  with `page()` and `controller()` are declared.
* **For other pages it is not.** A route under the prefix registered without `context`, or a built-in
  page kept in the context by the cookie, is protected by its own policies and model tokens only.
  Protect such routes, or declare them.
* Menu items are filtered by their tokens and by the declared context of their links, see
  [Navbar](#navbar).

The context token is an ordinary access rights token: register it with
`accessRightsHelper.registerToken()` (or `ctx.accessRight()` in an app) and grant it to groups as
usual.

---

## Switcher

The switcher replaces the brand menu of the stock sidebar when the user may enter more than one
context. It lists:

1. the contexts of the `adminContexts` shared prop — accessible ones with `switcher !== false` — with
   a check mark on the current one;
2. below a separator, the links of `config.sections`, which the brand menu used to show.

Selecting a context is a visit to its `link`: the prefix, or `home`.

---

## Frontend API

### Shared props

Every Inertia page receives:

```ts
interface AdminContextInfo {
    id: string;
    title: string;          // translated
    icon: string | null;
    prefix: string;         // full prefix, routePrefix included
    link: string;           // where the switcher leads
    layout: {
        root: "stock" | "none";
        // Module URLs in order, the default context's first. `default: "Layout"`
        // marks a module whose default export is the whole layout.
        layers: {module: string; default?: "Layout"}[];
        stylesheets: string[];
    };
}

// SharedData
adminContext?: AdminContextInfo;     // the context of this page
adminContexts?: AdminContextInfo[];  // contexts shown in the switcher; one entry means no switcher
```

`menu` and `menuSections` already belong to `adminContext`. The four props are computed once per
request, and only when a page is rendered.

### `useAdminContext()`

The hook (from `@/shell`) reads the context of the page in layouts, overrides and page components:

| Field | Meaning |
|---|---|
| `context` | `adminContext`. |
| `contexts` | `adminContexts`. |
| `menu`, `sections` | `menu` and `menuSections` of the context. |
| `isActive(link)` | Whether `link` is the active menu link — the most specific one matching the URL, as in the stock menu. |
| `switchTo(id)` | Visits the context's `link`. |

---

## Server API

`adminizer.contextHandler` (`ContextHandler`, exported from `adminizer`):

| Method | Purpose |
|---|---|
| `register(context, owner = "host")` | Add a context; returns its scope. |
| `unregister(id, owner?)` | Remove a context; with `owner`, only that owner's one. |
| `scope(id, registrar)` | A scope of a registered context that registers routes and components through `registrar`; `ctx.context()` uses it for the app's own routes and assets. |
| `configureDefault(options)` | Change title, icon, home, layout, navbar or switcher of the default context. |
| `get(id)`, `getDefault()`, `list()` | Read contexts; `list()` starts with the default one. |
| `listAccessible(user)` | Contexts the user may enter, the default one first. |
| `assign(path, contextId, {exact?, owner?})` | Declare the context of the pages at `path`; returns a function removing the declaration. |
| `declaredFor(url)` | The declared context of a page, if any. |
| `isBlocked(url, user)` | Whether the page belongs to a context the user may not enter. |
| `guard()` | The middleware blocking such pages; Adminizer mounts it before all routes. |
| `resolve(req)` | The context of a request. |
| `resolveLayout(context)` | The layout with inheritance applied, as sent in `adminContext.layout`. |

The scope returned by `register()` and `ctx.context()`:

| Member | Purpose |
|---|---|
| `id` | The context id. |
| `page(page)` | A page: route, menu item, breadcrumbs; returns the menu item. |
| `controller(controller)` | A route under the prefix without a menu item; returns its full path. |
| `menuItem(item)` | Appends an item to the context's menu. |

Exported types: `AdminContext`, `AdminContextLayout`, `AdminContextNavbar`, `AdminContextPage`,
`AdminContextController`, `AdminContextScope`, `AdminContextRegistrar`, `AdminContextProps`,
`AdminContextLayoutProps`, `AdminContextLayerProps`, `DefaultAdminContextOptions`, `ShellSlotName`,
`AppContextResource`, `AppContextScope`, and the constant `DEFAULT_ADMIN_CONTEXT_ID`.

### Events

| Event | Payload |
|---|---|
| `app:context:registered` | `{ appName, resourceId, id, prefix }` |
| `app:context:unregistered` | `{ appName, resourceId, id }` |

`appName` is the owning app, or `host` for contexts registered with `contextHandler.register()`.

---

## Compatibility

Earlier layout values keep working and draw exactly what they did:

| Earlier value | Same as |
|---|---|
| `"default"` | `"stock"` |
| `"bare"` | `"none"` |
| `{ overrides, stylesheet? }` | `{ module, stylesheet? }` |
| `{ component, stylesheet? }` | A module whose default export is the whole layout (`Layout`), over the stock layout, without the parent's layers. |

Routes, models and menus that do not use contexts are not affected: without registered contexts and
declarations every page resolves to the default context, the menu and layout are the stock ones,
the guard lets every request through and no cookie is written.

---

## Fixture example

`fixture/apps/contexts` holds the demo contexts, set up in `fixture/index.ts`; the code is in
`ContextDemoApps.ts`.

| Context | Registered by | URL | Shows |
|---|---|---|---|
| Default | host, `configureDefaultContext()` | `/adminizer` | `configureDefault({layout: {module}})`: a badge in the sidebar footer (`DefaultShellOverrides.tsx`). |
| Reports | host, `registerReportsContext()` | `/adminizer/reports` | `contextHandler.register()` with `page()`: inherited layout with `Sidebar`, `SidebarHeader`, `SidebarContent`, `Header` and `HeaderStart` overridden plus a `stylesheet` (`ReportsShellOverrides.tsx`, `.css`); `home`; `accessRightsToken` — hidden from users without `context-reports`, its pages answer 403 to them; a `menuItem()` group with `subItems`. |
| System | app `context-system` | `/adminizer/system` | Inherited layout with `HeaderActions` and `SidebarFooter` overridden (`SystemShellOverrides.tsx`), the footer wrapping the default context's override. Own menu with sections; `/model/Category` kept in the context by the cookie, and `/model/JsonSchema`, whose model declares `context: "system"` (`fixture/adminizerConfig.ts`), always opening in it. |
| Support desk | app `context-support` | `/adminizer/support` | `{module}` overriding `Sidebar` only: own sidebar with a badge next to the stock header (`SupportLayout.tsx`). |
| Studio | app `context-studio` | `/adminizer/studio` | `{module, base: "stock"}` exporting `Layout`, written from scratch: a top bar, no sidebar (`StudioLayout.tsx`). |
| Inherited | app `context-variants` | `/adminizer/inherited` | Neither `layout` nor `navbar`: the default context's menu and overrides; its page uses `menu: false`. |
| Plain | app `context-variants` | `/adminizer/plain` | `layout: "stock"`: the stock layout without the default context's overrides. |
| Kiosk | app `context-variants` | `/adminizer/kiosk` | `layout: "none"` and `switcher: false`: no shell, reached only through a link on the Inherited page. |

Build the bundles with `npm run build:context-apps` (part of `npm run build:apps`). Replacing the
title, menu or whole layout of the default context is left out of the fixture, since it would change
the whole demo panel.

---

## Limitations

* Global search (`Ctrl/Cmd+K`) and the AI assistant's link search hide pages the user may not open,
  but otherwise are not context-aware: they search the whole navigation registry, and an undeclared
  page they lead to opens in the context the cookie points to.
* `window.routePrefix` stays the panel root and the API base; contexts do not change it.
* Contexts do not nest: a context under another context's prefix inherits its layout from the default
  context, not from the outer one.
