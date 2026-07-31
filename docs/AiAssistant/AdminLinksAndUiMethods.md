# Admin Links & UI Methods

Two registries let an agent work with the panel itself rather than only with
data:

* **`AdminLinkHandler`** (`adminizer.adminLinkHandler`) — standalone admin pages
  and *link templates*, i.e. parametrized pages such as `/model/Test/edit/:id`.
* **`AiAssistantUiMethodHandler`** (`adminizer.aiAssistantUiMethodHandler`) —
  browser capabilities the agent may trigger through a `ui.method` frame.

Both are permission-scoped: an agent can only see and open what its user could
reach by clicking.

## Why templates

A concrete record page has no fixed URL — it only exists once the id is known.
So navigation is exposed in two shapes:

| Shape | Example | How the agent uses it |
|---|---|---|
| Link | `/admin/model/Test` | Pass as `href`. |
| Template | `/admin/model/Test/edit/:id` | Pass the template id plus `params: {id: "…"}`. |

`listTemplates(user)` returns everything parametrized the user may open:

* `model-<Model>-edit` and `model-<Model>-add` for every configured model,
  gated by `update-<Model>-model` / `create-<Model>-model`;
* `catalog-<slug>-item` for every catalog, gated by `catalog-<slug>`;
* `link-<slug>` for any navigation entry or registered admin link whose own
  `link` carries `:placeholders`;
* templates registered by apps.

Paths matching `/model/<Model>/remove` are excluded everywhere: opening one
mutates data, so it is never navigable and `isDestructivePath()` rejects it.

## Built-in UI methods

| Id | Action | Purpose |
|---|---|---|
| `search-admin-links` | `search-admin-links` | Search the user's accessible sections, links and templates. |
| `navigate` | `navigate` | Open a page in the current tab through the Inertia router. |

They are advertised to the panel in the UI schema (`schema.uiMethods` on
`GET …/status`) and to the model as tools you define.

The expected agent flow is: **search first, then navigate** — only to a link or
template the search returned.

```ts
const searchAdminLinks = tool({
    description: "Search admin pages visible to the current user. Returns concrete links and link"
        + " templates: a template has params and is opened by passing its id plus values.",
    inputSchema: z.object({query: z.string().min(1)}),
    execute: async ({query}) => ({links: this.searchAdminLinks(user, query)}),
});

const navigateAdmin = tool({
    description: "Open an admin page in the user's browser tab. Pass href for a concrete link, or"
        + " template plus params for a record page returned by search_admin_links.",
    inputSchema: z.object({
        href: z.string().min(1).optional(),
        template: z.string().min(1).optional(),
        params: z.record(z.string(), z.string()).optional(),
    }),
    execute: async (input) => {
        if (!session?.__openharnessPublish) {
            throw new Error("Navigation is available only during an active assistant response.");
        }
        return {opened: this.openAdminLink(input, user, session.__openharnessPublish)};
    },
});
```

Navigation needs the run's `publish` callback, which only exists during an
active turn — keep it on the session and fail explicitly when it is missing.

Note that the tool names visible to the model (`search_admin_links`,
`navigate_admin`) are yours to choose; the UI method ids
(`search-admin-links`, `navigate`) are the registry keys.

## `openAdminLink()`

`openAdminLink(target, user, publish)` does three things: resolves the target
against the user's permissions, publishes the `navigate` frame, and returns the
resolved URL so the agent can report it as the tool result.

`resolveNavigation()` rejects:

* a target with neither `href` nor `template`;
* an `href` outside `config.routePrefix`;
* an `href` that still contains `:placeholders` (must be passed as a template);
* a destructive path;
* a template the user may not open, or one with a missing parameter.

Template values are URL-encoded, so `{id: "a b/c"}` becomes
`/admin/model/Test/edit/a%20b%2Fc`.

## Registering pages from an app

```ts
setup(ctx: AppSetupContext): void {
    // A standalone page: appears in navigation and in agent search.
    ctx.adminLink({
        id: "reports:daily",       // required by the type, but always re-derived as `<type>:<name>`
        type: "reports",
        name: "daily",
        title: "Daily report",
        link: "/admin/reports/daily",
        section: "Reports",
        accessRightsToken: "reports-read",
    });

    // A parametrized page the assistant may open.
    ctx.adminLinkTemplate({
        id: "order-invoice",
        title: "Order: open invoice",
        template: "/admin/orders/:id/invoice",
        description: "Open the printable invoice of a single order by its id.",
        section: "Sales",
        accessRightsToken: "orders-read",
        params: [{name: "id", description: "Identifier of the order."}],
    });
}
```

* `link` / `template` must be absolute admin paths starting with `/`.
* Placeholders absent from `params` are still required — `params` only adds
  descriptions for the model.
* Ids must be unique; re-registering throws.
* Disabling the app removes both.

Admin links also show up in `listAccessibleMenuItems()`, so they are part of the
sidebar the user sees, not a parallel list.

## Registering a UI method from an app

```ts
ctx.skills.uiMethod({
    id: "open-media-preview",
    title: "Open media preview",
    description: "Open the media manager preview of a file by its id.",
    inputSchema: {
        type: "object",
        properties: {fileId: {type: "string"}},
        required: ["fileId"],
        additionalProperties: false,
    },
    action: "open-media-preview",
    accessRightsToken: "media-manager",
});
```

The registry and its permission check stay server-side, so an LLM cannot invoke
an arbitrary client event. The shared panel only has executors for the two
built-in actions; a custom `action` is ignored until the app's own frontend
bundle registers an executor for it.

## Client-side behaviour

`executeUiMethod()` in the panel runtime handles the incoming frames:

* `navigate` → `resolveAdminHref(input.href)` then a visit through
  `window.InertiajsReact.router`, falling back to a full page load.
* `search-admin-links` → dispatches the browser event
  `adminizer:ai-search-admin-links` with the input as `detail`.

### `resolveAdminHref()`

Agents — and the plain text an LLM writes — routinely guess an origin, drop the
dev port or omit the route prefix. `resolveAdminHref()` trusts only the path:

* `mailto:`, `tel:`, `data:` and `#anchors` are left untouched (`internal: false`);
* an absolute URL on another host is left untouched unless its path is inside
  the route prefix;
* otherwise the path is resolved against the current origin and a missing route
  prefix is restored.

This is why an agent should write paths exactly as a tool returned them
(`/admin/model/Test/edit/<id>`) and never build a full URL with a host.

## Prompting

Navigation only works if the model is told the flow. The fixture prompt
(`fixture/apps/ai-assistant/prompts/openharness.txt`):

```text
Use list_admin_navigation when the user asks what the panel offers or where something lives:
it returns their own menu, permissions applied.
Use search_admin_links before navigate_admin. Navigate only to a concrete link or template
returned by that search.
When you mention a page in your answer, write its path exactly as the tool returned it
(e.g. /admin/model/Test/edit/<id>); never build a full URL with a host.
```

## Testing

`test/admin-link-templates.test.ts` covers template listing, permission
filtering, encoding and rejection rules against a minimal Adminizer stand-in;
`test/assistant-links-client.test.ts` covers `resolveAdminHref()`.
