# Internal Queries

Adminizer uses an internal query language named `QueryCriteria` between higher-level services and ORM adapters. The goal is to keep Adminizer code independent from a specific ORM query syntax. UI filters, global search, and custom filter state are converted before execution; they are not part of `QueryCriteria`.

## QueryCriteria

```ts
interface QueryCriteria {
  where?: CriteriaWhere;
  select?: string[] | Record<string, boolean>;
  populate?: Record<string, true | QueryCriteria>;
  sort?: string | Record<string, "ASC" | "DESC" | "asc" | "desc">;
  limit?: number;
  skip?: number;
}
```

Basic example:

```ts
await model.find({
  where: {
    parent: null,
    mimeType: { contains: "image" },
    group: "default"
  },
  sort: "createdAt DESC",
  limit: 20,
  skip: 0,
  select: ["id", "filename", "url"]
});
```

## Operators

Field values can be primitives, arrays, or operator objects.

```ts
await model.find({
  where: {
    status: "published",
    title: { contains: "release" },
    createdAt: { between: [fromDate, toDate] },
    id: { in: [1, 2, 3] },
    deletedAt: { isNull: true }
  }
});
```

Supported operators:

| Operator | Meaning |
|---|---|
| `eq` | Equals |
| `ne` | Not equals |
| `gt`, `gte`, `lt`, `lte` | Numeric/date comparisons |
| `contains` | String contains |
| `startsWith`, `endsWith` | String prefix/suffix |
| `in`, `notIn` | Value is in/not in array |
| `between` | Inclusive range |
| `isNull`, `isNotNull` | Null checks |
| `regex` | Adapter-supported regular expression |
| `jsonContains` | Adapter-supported JSON containment |

Arrays are treated as `in`:

```ts
await model.find({ where: { id: [1, 2, 3] } });
```

## Boolean Groups

`and`, `or`, and `not` are adapter-neutral boolean groups.

```ts
await model.find({
  where: {
    and: [
      { status: "published" },
      {
        or: [
          { title: { contains: "Adminizer" } },
          { description: { contains: "Adminizer" } }
        ]
      },
      { not: { archived: true } }
    ]
  }
});
```

## Populate

`populate` describes relations to load. A relation can be `true` or another `QueryCriteria`.
When a relation criteria contains `select`, the selected fields are evaluated against the related model, not the parent model.

```ts
await mediaModel.find({
  where: { parent: null },
  populate: {
    variants: {
      sort: "createdAt DESC",
      select: ["id", "url", "mimeType"]
    },
    meta: {
      where: { isPublic: true }
    }
  }
});
```

Nested `populate` is allowed:

```ts
await notificationModel.find({
  populate: {
    userNotifications: {
      populate: {
        userId: true
      }
    }
  }
});
```

## QueryBuilder Boundary

`QueryBuilder` accepts UI-oriented parameters such as `filters`, `globalSearch`, and `fields`, then converts them into `QueryCriteria`.

This separation is intentional:

- `FilterCondition[]` belongs to the filter UI and saved filter models.
- `globalSearch` belongs to list/table UX.
- `fields` is a display/export selection.
- ORM adapters receive only `QueryCriteria`.

Raw SQL and in-memory custom filter results are not part of `QueryCriteria`. Custom filters that participate in database queries should return adapter-neutral `criteria`.

## Internal Model Access

System modules should access internal models through `ModelHandler`:

```ts
const user = await adminizer.modelHandler
  .internal("widgets")
  .get("User")
  .findOne({ where: { login: "admin" } });
```

This path is intended for trusted Adminizer subsystems that must bypass `DataAccessor` user filtering. It replaces direct calls to protected adapter methods such as:

```ts
// Do not use in application/module code.
adminizer.modelHandler.model.get("User")["_findOne"](...)
```

## Allowlist Scopes

Each internal access scope has an allowlist of models. Built-in scopes include:

| Scope | Purpose |
|---|---|
| `auth` | Login, registration, init user |
| `users` | Built-in user/group controllers |
| `filters` | Saved filters and filter columns |
| `media-manager` | Legacy v5 access to app-owned media manager models |
| `history` | History actions |
| `notifications` | Notification models |
| `navigation` | Navigation storage |
| `widgets` | Dashboard widgets |
| `feed` | Feed export |

Projects can extend the allowlist with `system.internalModelAccess`:

```ts
const config = {
  system: {
    internalModelAccess: {
      "my-module": ["User", "Filter"]
    }
  }
};
```

Then use the custom scope:

```ts
const filters = await adminizer.modelHandler
  .internal("my-module")
  .get("Filter")
  .find({ where: { modelName: "Example" } });
```

Use `DataAccessor` for normal user-facing model operations. Use `internal(...)` only for system-level Adminizer modules or trusted integrations.

The `media-manager` scope is retained for compatibility. It does not make media manager models part of the core system contract and does not create them. New media manager apps should declare model access through `ctx.modelAccess()` and use `runtime.models`.
