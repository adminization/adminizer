# Record Access — Cheat Sheet

Every access case `DataAccessor` covers, as *what you want* → *how you declare it*.
Each section links to the page with the full rules.

* Field visibility → [Field-Level Restrictions](AccessRightsModelFields.md)
* Record ownership and access graphs → [User-Owned Records & Memberships](user-owned-records.md)
* Tokens → [Access Rights Tokens](access-rights-tokens.md)

---

## 1. Field access — who sees which columns

| Want | Config |
| --- | --- |
| A field visible to one group only | `fields: {salary: {groupsAccessRights: ["managers"]}}` |
| Different field sets in list / form / view | `list.fields`, `add.fields`, `edit.fields` (merged over `fields`) |
| Hide fields from "default" users | `registration.defaultUserGroup` — that group sees no field lacking an explicit `groupsAccessRights` |
| Administrator sees everything | `isAdministrator` bypasses field checks |

The model's own primary key is always visible — otherwise references break.

---

## 2. Record access — "my own records" (`userAccessRelation`)

| Want | Config | How it works |
| --- | --- | --- |
| User sees only their own records | `userAccessRelation: "author"` (relation → `User`) | read: `{author: userId}`; create stamps the column with the current user and drops a submitted value; update never re-stamps the owner — protection is the filter alone |
| Same, but on an FK column | `userAccessRelation: "ownerId"`, with an association alias `via: "ownerId"` → `User` | as above |
| Records visible to the user's whole group | `userAccessRelation: "group"` (relation → `Group`) | read: `{group: {in: userGroupIds}}`; create requires the user to be in exactly one group, otherwise the save is rejected |
| Ownership one hop away (`Report → Project → User`) | `userAccessRelation: {field: "project", via: "owner"}` | the user's `Project`s are resolved → `{project: {in: ids}}`; on write only one of their own projects may be chosen |
| Membership in a target model through a join model | `{field: "project", through: "ProjectMember", via: "user"}` | only records whose target has a membership row are visible; create and moves are confined to the targets the user belongs to |
| Different roles in different projects | add `group: "group"` to the form above | a membership counts only for the actions whose CRUD token (`create\|read\|update\|delete-<Model>-model`) its group carries; the `Group` records stay reusable role definitions and grant nothing globally |
| Arbitrary custom per-record logic | `userAccessRelationCallback(userWithGroups, record)` | |

Declarations are validated at request time with explicit errors: `through` must have
exactly one relation to the target model, `via` must point at `User`, `group` at `Group`.

---

## 3. Record access over a model graph (`accessGraph`)

> **Experimental.** `accessGraph` may change its config format and access semantics in a minor
> release; enabling it logs a warning at boot. See
> [User-Owned Records](user-owned-records.md#access-graph-record-access-over-a-model-graph-accessgraph).

For chains where membership is granted at the root but the leaf has no direct relation
to it — `Project → Task → Comment`:

```ts
accessGraph: {
  project: {
    root: "Project",
    membership: {through: "ProjectMember", via: "user", group: "group"},
    include: {Task: {parent: "project"}, Comment: {parent: "task"}, AgentRun: {parent: "task"}},
  }
}
```

| Want | Config |
| --- | --- |
| Declare the boundary once for the whole chain | `include: {Model: {parent: "alias"}}` — one edge per model, the parent model is derived from the alias |
| Narrow association pickers in forms too | automatic — pickers read the model through the same `DataAccessor` |
| Exempt one model from the graph | leave it out of `include` — a covered model cannot opt out, the graph wins over its own `userAccessRelation` |
| A "graph superuser" who sees everything | `bypassToken: "project-admin"`, matched against the user's global groups |
| Root-id source outside the panel (external service, raw SQL) | `resolveGraphRootIds: (user, verb) => ids \| "all" \| undefined` |
| Speed: denormalized root-id column | `graphRootField: {Comment: "projectId"}` — the read filter collapses to one step; the column is maintained by the application |
| Speed: one SQL instead of intermediate id lists | `pushdown: true` — nested subqueries emitted by the adapter; falls back to materialization across connections; the write path always uses the materialized walk |
| Extend another app's graph | `ctx.config()` — patches deep-merge per graph key |

Both speed rows exist for one reason: by default a graph read costs one query per level of the
chain and inlines every intermediate id the user can reach into the last of them, so the filter
gets more expensive as an account grows, not as the page grows. `pushdown` is a permission rather
than a guarantee (and TypeORM has no pushdown at all) — when a chain cannot be compiled, the model
falls back to materialization and Adminizer warns once, naming the model and the reason.

The graph is compiled and validated at boot (acyclic, every path reaches the root, a
model belongs to at most one graph). A structurally broken graph **denies** access to
its models rather than leaving them unrestricted. Global CRUD tokens remain the upper
bound: the graph narrows rows, it never grants access the token gates denied.

---

## 4. Access boundaries

| Want | Config |
| --- | --- |
| Foreign records through a populated association | nothing to configure — populated records of restricted models are always verified, and those out of reach collapse to a bare primary key. Where the adapter can, the confinement is compiled into the populate JOIN itself (no extra query); otherwise one batched query per associated model per request |
| Change history | history rows are filtered by the same access rules; a user's own actions always stay visible, otherwise their own audit trail disappears |
| Internal resolver queries | the `widgets`, `feed`, `navigation`, `history` and `data-accessor` internal scopes deliberately bypass record access — see [Internal Queries](../InternalQueries.md). The `data-accessor` allowlist is built from the config automatically and rebuilt on config-layer changes and model (un)registration |

---

## 5. Ownership transfer and records left out of reach

* **Handing a record to another owner**: the `transfer-<Model>-ownership` token is
  registered automatically for every model declaring `userAccessRelation` and granted
  to nobody by default. Its holders may set the owner column explicitly, exactly as
  administrators do. For `accessGraph` models the equivalent is the graph's
  `bypassToken`.
* **A record created without an owner or parent** is legal — partial updates omit the
  column — but only administrators will ever see it again. Adminizer logs a warning; declare
  the relation `required` on the model to rule it out.
