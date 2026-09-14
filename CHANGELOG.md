# Changelog

## Unreleased — record-level access hardening

Security fixes around `userAccessRelation` and the new `accessGraph`. Behaviour that changes for
existing projects is listed under **Breaking**, each with what to do about it.

### Added

* **`accessGraph` (experimental)** — relationship-based record access (ReBAC): each key declares
  one access graph — a root model carrying memberships plus the models that inherit its visibility
  down explicit parent edges. See
  [User-Owned Records & Memberships](docs/AccessRights/user-owned-records.md) and the
  [Record Access Cheat Sheet](docs/AccessRights/record-access-cheatsheet.md).
  The feature is marked `@beta`: its configuration format and access semantics may change in a
  minor release, and a project that declares `accessGraph` logs a warning at boot naming the
  graphs in use.
* **Membership form of `userAccessRelation`** — `{field, through, via[, group]}` filters records
  by the targets the user holds a membership row for; with `group`, a membership only counts for
  the actions whose CRUD token that group carries.
* **Record-level access on populated associations.** Populated records of access-restricted
  models are verified on every read; those out of reach collapse to a bare primary key. For
  single associations the confinement is compiled into the populate JOIN's `ON` clause where the
  adapter supports it (Sequelize `belongsTo`; TypeORM `many-to-one` with a declared FK column) —
  no extra query, and the closed fields never leave the database. Other associations are
  verified post-read with one batched query per associated model per request.
* **`transfer-<Model>-ownership` token** — registered for every model declaring
  `userAccessRelation`, granted to nobody by default; its holders may set the access relation
  explicitly instead of inheriting their own.
* Change history is now filtered by record access; a user's own actions always stay visible.
* **Runnable `accessGraph` demo in the fixture** — `fixture/apps/project-graph/` packages the
  `Project → Task → Message` chain (models, graph, per-project roles and demo data) as an
  Adminizer app; `ENABLE_PROJECT_GRAPH=false` removes it entirely.
* **Sidebar item counts.** `badge` on `navbar.additionalLinks[*]`, `ctx.adminLink({...})` and any
  item returned by `handleAdditionalLinks` is drawn as a `SidebarMenuBadge` in the expanded
  sidebar (never in the collapsed rail). It is a number/string, or a resolver
  `(user) => count | Promise<count>` evaluated per request for the items the user may open, so
  an app owns both its link and its count; a resolver that throws is logged and renders nothing.
  Menus without it render exactly as before.
* **Breadcrumbs from page props.** Any Inertia page — app modules included — may send
  `breadcrumbs: [{title, href?}]`; the header renders them (the last crumb needs no `href`).
* **Navigation registry powers breadcrumbs and search.** `AdminLinkHandler` gains
  `search(user, query)` (the assistant's `searchAdminLinks` now delegates to it;
  `AiAssistantAdminLink` stays as an alias of `AdminLinkSearchResult`) and `locate(user, url)`,
  the breadcrumb chain of a url built from menu items, app links and link templates. With
  `navbar.breadcrumbs: 'auto'` pages that send no `breadcrumbs` receive that chain as a lazily
  evaluated shared prop; the default `'manual'` changes nothing.
* `GET {routePrefix}/api/links/search?q=` — JSON proxy of the registry search, filtered by the
  caller's permissions.
* **A model hidden from the navbar is hidden from the registry.** `navbar.visible: false`, or
  `navbar.groupsAccessRights` naming groups the user is not in, now also suppresses the model's
  automatic `model-<Model>-edit` / `model-<Model>-add` link templates, so the model is absent
  from the global search, the assistant's navigation and auto breadcrumbs. Previously only the
  menu item was hidden and the assistant could still open such a model through its template.
* **Global search (Ctrl/Cmd+K)** in the header, backed by the same registry. It also handles the
  assistant's `search-admin-links` browser action, which previously had no listener.
* **`moduleLayout: 'bare'`** for app pages: the `module` page drops its content margin, so an
  edge-to-edge canvas, log or diff viewer no longer fights it with negative margins.
* **`--warning` / `--warning-foreground`** palette tokens (light and dark) with the
  `--color-warning` theme mapping; `Badge` gains `variant="warning"`.

### Breaking / security

* **Restricted records no longer leak through populated associations.** Reading a model whose
  relation points at a `userAccessRelation`/`accessGraph`-restricted model used to return the
  full populated record even when the user could not reach it; now such records arrive as their
  bare primary key. There is no off switch. *Frontends reading `record.relation.field` must
  handle the bare-id form — the same form the relation already has when unpopulated.*
* **Write rules now run on update, not only on create.** A non-administrator can no longer
  change the owner, group or graph of an existing record: the value is stripped (string form) or
  rejected with `Access denied` (via/membership forms). *If handing records over is a legitimate
  workflow, grant the model's `transfer-<Model>-ownership` token.*
* **Administrators no longer have the access column stamped automatically.** Previously an admin
  creating a record on a Group-restricted model either got their own group stamped or an
  exception when they had none. Now the value they send is kept as is — including an empty one,
  which produces a record no restricted user can see. *A warning is logged; check for records with an empty
  access column after upgrading.*
* **`{in: undefined}` and `{in: null}` fail closed.** An absent IN operand used to be dropped
  silently, which widened the query; it now matches nothing on both the Sequelize and TypeORM
  adapters. *A user with no groups on a Group-restricted model now sees nothing instead of
  everything.*
* **`intersects` throws** on both adapters. It was only ever emitted by the unsupported
  collection form of `userAccessRelation`, where it produced a wrong (widened) query.
* **`DataAccessor.getFieldsConfig()` denies access again.** Since the switch to an asynchronous
  `hasPermission` it always returned a truthy promise, so every user received the field config;
  the synchronous `hasStaticPermission` restores the check. *Users without the model's CRUD token
  stop seeing its fields.*
* **`registration.defaultUserGroup` is compared case-insensitively.** A capitalised group name in
  the config used never to match, so guarded fields stayed visible to the default group; they are
  hidden now.
* **Model CRUD tokens may no longer carry a contextual `check`.** Such a token is denied by every
  synchronous path and would silently hide all fields of the model; registering one now throws.
* **Token ids are emitted in canonical lowercase.** The runtime already normalised them, but
  project tests stubbing `accessRightsHelper` must now stub `hasStaticPermission` (not
  `hasPermission`) and expect lowercase ids.

### Breaking / data safety — delete cascade

The Sequelize adapter deletes related records in the application. Two of its rules were wrong and
destroyed records the deleted row did not own:

* **Deleting one record no longer deletes its parent.** `destroyOne` cascaded into `belongsTo`
  associations, so removing a task removed its project (and orphaned every sibling). `destroy`
  (many) already skipped parents; the two paths now share one implementation.
* **Deleting a record no longer deletes the far side of a many-to-many relation.** It used to
  destroy the associated rows themselves — deleting one post deleted a tag another post still
  used. Only the link rows in the through model are removed now.
* Children (`hasOne` / `hasMany`) are still deleted, but in one statement per association instead
  of one per row. Row-level `beforeDestroy`/`afterDestroy` hooks are preserved for target models
  that declare them (detected via `Model.hasHook`); models without hooks get a single bulk
  `DELETE`.

### Fixed

* **Reads no longer issue a query per association per row.** `_find` called every association
  getter on every returned row and discarded the result — a page of 50 records with 4
  associations cost 201 queries instead of 1. Sequelize getters never write into `dataValues`,
  so the output is unchanged (associations come from the `include` of the main query).
* Change-history lookups are batched: display names and related-id checks now issue one query per
  model instead of one per row.
* Media manager variants are loaded with one query instead of one per variant; catalog item
  lookups resolve in parallel.
* `pushdown: true` now honours `paranoid` models and falls back to materialization for models
  carrying a `defaultScope`, so both modes return the same records.
* **A `pushdown: true` that does nothing is no longer silent.** Every fallback to materialization
  (a `defaultScope` on the chain, a model on another connection, an unresolvable attribute, an
  adapter without pushdown — TypeORM has none) returns the same records, so an inert flag used to
  be undetectable outside the SQL log. The first fallback per model now logs a warning naming the
  graph, the model and the reason; it repeats after a recompile, and silence means the chain
  compiled.
* A record-access filter no longer overwrites a caller's filter on the same field — the two are combined
  with `and`.
* **Module stylesheet recipe** (`docs/BuildingModules.md`) omitted `tailwindcss/theme.css`, so
  scale-based utilities (`p-4`, `text-sm`, `rounded-md`…) were silently not generated, and its
  `--radius: var(--radius)` line compiled to a self-referencing `:root` property that squared
  every corner of the panel. The example now imports the theme with `theme(reference)` and maps
  `--radius-sm|md|lg|xl`.
* **`adminizer/ui/*` package export removed.** It pointed at `./dist/…`, which does not exist in
  the published package (the package root *is* `dist/`), and the files behind it import the
  build-time `@/` alias — the import never resolved at runtime in any release. Modules use
  `window.UIComponents`; types come from `adminizer-module.d.ts`.
* **App modules receive fresh props.** The `module` page rendered the module with the props
  captured when its bundle was first imported, so a partial reload (`router.reload({only})`) or a
  `preserveState` visit left it stale; it now re-renders with the current page props.
* **`window.sonner.toast(...)` from an app module is visible.** The layout mounts a single
  `Toaster`; the per-page copies are gone. *Modules that mounted their own `<Toaster/>` as a
  workaround must remove it, or every toast shows twice.*
* **The command palette dialog is clickable.** `CommandDialog` never passed a z-index, so the
  `z-[1010]` `DialogOverlay` covered its own `z-50` content and swallowed every click.
* **A single-record update no longer widens to every record in the user's reach.** Both adapters
  read field conditions from `criteria.where` when it has keys and from the top level otherwise;
  injecting the access filter into `where` therefore orphaned a flat criteria such as `{id}`.
  `sanitizeUserRelationAccess` now folds the flat form into `where` first. Inline list editing
  hit this on every access-restricted model: it addresses the record by a bare id.
* **Inline list editing addresses the right record.** It built its criteria from
  `identifierField` alone, without the primary-key fallback the rest of the controller uses, so
  the key was `undefined` on any model that does not configure one. It also reported success when
  record access matched nothing; it answers `404` now, instead of leaving the edited value on
  screen.
* The compiled-graph cache is keyed by the model registry, so two Adminizer instances sharing a
  config object cannot read each other's compilation.
* Membership lookups are memoized per request through a shared `RecordAccessCache` instead of once
  per accessor.
