### **User-Owned Records**

In multi-user admin panels, it’s often essential to restrict data access based on ownership — that is, which user a record belongs to. `DataAccessor` supports this logic through model configuration by linking records to the canonical `User` system model. This enables:

* Automatically setting the `userId` field (or equivalent) on record creation
* Restricting access so that users can only read or modify their own records
* Enforcing ownership-based permission checks seamlessly
* Supporting clean separation of data in multi-tenant or user-based systems

> For a one-table overview of every case on this page, see the [Record Access Cheat Sheet](record-access-cheatsheet.md).

#### **How It Works**

In the model config, you specify a field that connects the record to a user:

```ts
models: {
  Report: {
    userAccessRelation: "author", // field that links to User
    fields: {
      content: { type: "text" },
      author: { model: "User" }
    }
  }
}
```

If the user is **not an administrator**, they will only be able to access records where they are listed in the `author` field. This ownership check is enforced automatically through `sanitizeUserRelationAccess`.

#### **Create vs Update Behavior**

When `userAccessRelation` points to a `User` association (for example, `author`):

* On **create**, ownership is assigned automatically via `setUserRelationAccess`:
  * If a non-admin sends any `author` value manually, it is ignored.
  * The saved value is forced to the current user ID.
* On **update**, ownership is **not auto-assigned** again:
  * Access is still restricted to the user’s own records through `sanitizeUserRelationAccess`.
  * If a non-admin sends any `author` value manually, it is stripped — a record cannot change owner through the panel.
  * In other words, update is protected by ownership filtering, not by re-writing the owner field.

#### **Important Notes**

* The `userAccessRelation` field must exist in the ORM model and be an association to the canonical `User` system model. If the host ORM target is named differently, configure the adapter `systemModels` mapping.
* The user model must be properly registered and include the required access rights tokens.
* Without defining `userAccessRelation`, access is controlled only via global permissions (using `AccessRightsHelper`), not per-record ownership.

#### **FK + Alias Support**

`userAccessRelation` may reference either:

* a direct association field (for example, `owner`), or
* a foreign key field (for example, `ownerId`) when there is an association alias with `via: "ownerId"` that points to `User`.

This is useful for ORM schemas where relation metadata is stored on an alias field while the configured access field is a plain FK column.

#### **Group Ownership (string form)**

The string form may also name an association to the canonical `Group` model. Records are then
visible to every member of the record's group, and on create the field is auto-assigned from the
user's groups — which requires the user to belong to **exactly one** group, otherwise the save is
rejected.

### **Intermediate Ownership: `{field, via}`**

Ownership may live one hop away from the record. If `Report.project` points at `Project`, and
`Project.owner` points at `User`, then:

```ts
models: {
  Report: {
    userAccessRelation: { field: "project", via: "owner" }
  }
}
```

restricts users to reports of the projects **they own**: at query time the intermediate model is
searched for records whose `via` field matches the current user, and the main model is filtered by
those ids. On create/update, a non-admin may only choose an intermediate record that belongs to
them. `via` must be a relation to the canonical `User` model.

### **Memberships: `{field, through, via, group}`**

The membership form replaces "the user **owns** the intermediate record" with "the user **is a
member of** it" — a join model decides who belongs where, and optionally with which role:

```ts
models: {
  Task: {
    userAccessRelation: {
      field: "project",           // Task's relation to the target model (Project)
      through: "ProjectMember",   // membership model: one relation to Project, one to User, optionally one to Group
      via: "user",                // ProjectMember's relation to User
      group: "group"              // optional: ProjectMember's relation to Group
    }
  }
}
```

* **Visibility**: non-admins only see records whose target they have a membership row for.
* **Writes**: on create (and when changing the target field), the chosen target must be one of
  the user's memberships — so a record cannot be created under, or moved to, a target they do
  not belong to.
* **Per-target roles** (when `group` is set): a membership only counts for the actions whose CRUD
  token (`create|read|update|delete-<model>-model`) its group carries — as a plain token id or a
  structured grant (`{tokenId, rights}`) in `Group.tokens`. The same user can therefore be a
  read-only "tester" in one project and an "editor" in another, while the `Group` records
  themselves stay reusable role definitions: membership rows never enter `user.groups`, so they
  grant nothing globally.

Declaration rules, all validated at request time with explicit errors:

* `field` must be a relation of the main model to the target model.
* `through` must resolve to a registered model with **exactly one** relation to that target model —
  two relations (or none) are refused rather than guessed.
* `via` must be a relation of the `through` model to the canonical `User` model.
* `group`, when present, must be a relation of the `through` model to the canonical `Group` model.

Two things to keep in mind:

* **Global tokens remain the upper bound.** The membership filter narrows *rows*; it never grants
  access the token gates denied. A user still needs the model's CRUD tokens (through their regular
  groups) to enter the section at all — the membership's `group` can only restrict what those
  tokens reach per target, not extend them.
* The `through` model (and `Group`, when `group` is used) is added to the `data-accessor` internal
  model access scope automatically when the config is loaded; if you build the access map manually
  (for example, in tests), whitelist them yourself.

### **Access Graph: record access over a model graph (`accessGraph`)**

> **Experimental feature.** `accessGraph` is experimental (`@beta`). Its configuration format and
> access semantics may change in a minor release, and enabling it makes Adminizer log a warning at
> boot (`[accessGraph] accessGraph is an EXPERIMENTAL feature ...`). Review the resulting record
> visibility yourself before relying on it in production; the stable alternative is a per-model
> [`userAccessRelation`](#user-owned-records).

The membership form covers one model looking at one target model. Real schemas are chains:
`Project → Task → Comment`, `Project → Task → AgentRun`. Membership is granted once, on
`Project`, but `Comment` has no direct relation to it — only transitively through `Task`.
Instead of duplicating `userAccessRelation` (or denormalizing `projectId`) onto every model,
`accessGraph` declares the boundary once, as a top-level config section next to `models`:

```ts
accessGraph: {
  project: {                                  // graph key — a stable contract name
    root: "Project",                          // root model of the graph
    membership: {through: "ProjectMember", via: "user", group: "group"}, // same form as above, now at the root
    include: {
      Task:     {parent: "project"},          // Task.project → Project (direct edge to the root)
      Comment:  {parent: "task"},             // Comment.task → Task (transitive)
      AgentRun: {parent: "task"},
    },
  }
}
```

Every model of the graph is then filtered without a line of its own: the root by the user's
membership root ids, each included model by the visible ids of its parent level (`Comment` →
`{task: {in: taskIds}}`) — free to declare, but not free to run; see
[the two performance options](#two-performance-options) below.
Association pickers in forms are covered by the same mechanism — the "choose a task" dropdown
reads `Task` through the same `DataAccessor`, already narrowed.

Rules:

* **One edge per model.** `parent` names the association alias the model uses to look at its
  parent; the parent model is derived from that alias and must itself belong to the graph. Edges
  are never guessed from foreign keys.
* **Membership is declared once, at the root.** With `group` set, a membership only counts for
  the actions whose CRUD token (`<verb>-<model>-model`, checked against the model being
  **accessed**) that group carries.
* **The graph wins over `userAccessRelation`** — once a graph covers a model, that model's own
  declaration stops applying and the graph filters it. Declaring both is a configuration error —
  the graph logs it as such at compile time, naming the model and both ways to resolve it. A model cannot opt out of a graph it belongs to: its records are visible only
  through the parent edge, and the populate verification of that edge is skipped on exactly
  that premise — an opt-out would leak the parent record through the association. To keep a
  model on its own rule, leave it out of `include`. Administrators bypass the graph entirely.
* **Writes**: the chosen parent (`Comment.task`, `Task.project`) must be reachable for the
  action's verb; creating in — or moving a record to — a foreign branch is refused.
* **Global tokens remain the upper bound**: the graph narrows rows, it never grants access the
  token gates denied.
* **Validation is fail-loud at boot and fail-closed afterwards.** The graph is compiled and
  validated on startup (acyclic, every path reaches the root, every edge exists and stays inside
  the graph, a model belongs to at most one graph, exactly one membership definition per graph
  key). A structurally broken graph or node denies access to its models instead of silently
  leaving them unrestricted. The only fail-soft case is an `include` entry naming a model that is not
  registered (yet) — such a model is unreachable through the panel anyway and joins the graph as
  soon as it is registered.

Two escape hatches, both at the root:

* `bypassToken: "project-admin"` — users whose **global** groups carry this token see the whole
  graph unfiltered.
* `resolveGraphRootIds: async (user, verb) => ids | "all" | undefined` — replaces the membership
  source at the root (external service, raw SQL, custom logic) without touching the graph below
  it. `"all"` is the explicit bypass; `undefined` falls back to the declared `membership`.

#### Two performance options

**What the default costs.** Walking the chain means one query per level before the query the
page actually asked for: "which projects is this user in", then "which tasks are in those
projects", and only then the list of comments — with every reachable task id inlined into it as
an `IN (...)` list. Nothing here depends on how many rows the page shows, and everything depends
on how much data the user has: a member of 500 projects with 50 tasks each pays for 25 000 ids to
render 25 rows, so the accounts that slow down first are the largest ones. Both options below
attack exactly that, and they combine.

* **`graphRootField: {Comment: "projectId"}`** — a denormalized root-id column collapses the model's
  read filter to one step (`{projectId: {in: rootIds}}`) instead of walking the parent chain; a
  root-id column on an intermediate model shortcuts every model below it too. The column is
  maintained by the application — Adminizer only filters by it. The `include` edge stays
  declared and writes keep validating the chosen parent through it.
* **`pushdown: true`** — the read filter compiles into **one** nested-subquery SQL emitted by
  the adapter (`... WHERE task IN (SELECT id FROM tasks WHERE project IN (SELECT project FROM
  project_members WHERE user = :uid))`), so the DB planner optimizes the whole walk and no
  intermediate id lists are materialized in the application. The SQL is generated from the
  declaration — nothing is written by hand. It applies when every model on the path (and the
  membership model) lives on the same Sequelize connection; otherwise — and for
  `resolveGraphRootIds`-provided ids — the resolver falls back to per-level materialization
  automatically. Group narrowing still resolves the granting group ids in the application (token
  grants are JSON) and injects them into the membership subquery. Write-path validation always
  uses the materialized walk.

**A fallback is reported, not silent.** The flag is a permission, not a guarantee: any of the
cases above sends the model back to materialization, and an adapter that does not implement the
hook at all (today: TypeORM) never pushes anything down. Since the records come back the same
either way, a graph could otherwise carry `pushdown: true` for years without it doing anything.
So the first time a model falls back, Adminizer logs a warning naming the graph, the model and the
reason — `defaultScope`, another connection, an unresolvable attribute, an adapter without
pushdown:

```
[accessGraph] graph "project": "Comment" declares pushdown: true, but its read filter cannot be
compiled into a subquery — "Task" declares a defaultScope, which raw SQL cannot reproduce ...
Falling back to per-level materialization: the records are the same, but the read costs one query
per level of the chain plus every intermediate id inlined into the final query.
```

It is a warning, not an error — nothing is broken and access stays correct — and it is emitted once
per model, then again after a recompile (config change, model registration), since the answer may
have changed. Silence means the chain compiled. One trade-off runs the other way: the
per-request cache resolves each level once for the whole page, so a form with many association
pickers reuses one materialized walk, while the pushed-down subquery is re-executed inside every
statement — worth measuring on chains whose foreign keys are not indexed.

Apps declare their graphs with the same `ctx.config()` patch they already use for model UI
config; patches deep-merge per graph key, so one app can define a root and another can extend its
`include` with its own models.

A runnable example of exactly this lives in the fixture: `fixture/apps/project-graph/` packages
the `Project → Task → Message` chain above as an app — models, graph, per-project role groups and
demo data — and `ENABLE_PROJECT_GRAPH=false` removes it again.

This approach ensures secure and isolated access to data across users — critical for SaaS platforms, B2B applications, and any system with private user-specific content.

## Boundaries of record access

Record access confines **queries against the restricted model**. Three surfaces reach records by
another route and are handled separately — knowing which is which prevents assumptions that do
not hold.

### Populated associations

An adapter populates associations regardless of record access, so a record you may not reach can
be referenced by one you may. Adminizer therefore verifies populated records of restricted models
on every read and replaces those out of reach with their bare primary key. There is no switch:
leaving restricted records readable through a relation is a leak, so the verification is always
on (administrators excepted — no rule confines them).

Mechanically, the cheap path is preferred and the safe path is the fallback:

* **Pushdown** — for a single (`belongsTo`-style) association whose access filter has a plain
  column shape, the confinement is compiled into the populate JOIN's `ON` clause. The database
  then returns closed records as bare foreign keys directly: no extra query, and the closed
  fields never leave the database. Requires the adapter to support it for that association
  (Sequelize: any `belongsTo`; TypeORM: `many-to-one` with the FK declared as a real column
  property).
* **Post-read verification** — everything else (collections, unsupported associations, access
  filters too complex to inline) is verified after the read against the target model's own
  rules: one batched query per associated restricted model per request, memoized for the
  request's lifetime.

Both paths produce the same shape: a record out of reach arrives as its bare primary key.

The edge a graph model uses to reach its parent is never verified: a child is visible only
because its parent is, so the parent is inside the graph by construction.

### Change history

History rows name a record (`modelName` + `modelId`), so they are filtered by the same access
rules before being returned — one query per referenced model. A user's **own** actions always stay
visible: a delete removes the very row an access check would have to match, and hiding it would
erase the author's own audit trail.

### Internal queries

Internal scopes (`widgets`, `feed`, `navigation`, `history`, `data-accessor`) deliberately bypass
record access — they are the mechanism the resolvers themselves are built on. See
[Internal Queries](../InternalQueries.md).

## Transferring ownership

A record of a restricted model is pinned where it was created: a non-administrator can neither
stamp a foreign owner on create nor move a record out of their own reach. Where handing a
record over is a legitimate workflow, grant the model's `transfer-<Model>-ownership` token — it
is registered automatically for every model declaring `userAccessRelation` and granted to nobody
by default. Its holders may set the access relation explicitly, exactly as administrators do.

For `accessGraph` models the equivalent escape hatch is the graph's `bypassToken`: moving a
record between two graph roots you already belong to needs no extra right.

## Records left out of reach

Both the `userAccessRelation` string form and a graph `include` edge accept an empty value:
partial updates legitimately omit the column. A record **created** without one, however, hangs
outside every graph and membership, and only administrators will ever see it again — which looks like data loss
from the panel. Adminizer logs a warning in both cases; declare the relation `required` on the
model to rule it out entirely.
