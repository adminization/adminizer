# Filters in Adminizer

This document describes the current filter implementation in the codebase (backend + frontend).

## Overview

The filter subsystem allows users to:

- build and apply temporary filters;
- save personal/shared filters with metadata;
- store per-filter column order;
- expose private filters as JSON/XML feeds (with API keys);
- use relation and custom conditions for Sequelize models.

Main files:

- `src/models/FilterAP.ts`
- `src/models/FilterColumnAP.ts`
- `src/lib/filters/FilterService.ts`
- `src/lib/query-builder/ModernQueryBuilder.ts`
- `src/controllers/filter-fields/*`
- `src/assets/js/components/list-table/filter-panel.tsx`

## Data Models

### `FilterAP`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string` | Required |
| `description` | `string?` | Optional |
| `modelName` | `string` | Required |
| `conditions` | `FilterCondition[]` | JSON array |
| `sortField` | `string?` | Optional |
| `sortDirection` | `'ASC' \| 'DESC'?` | Optional |
| `visibility` | `'private' \| 'public' \| 'groups' \| 'system'` | Access mode |
| `ownerId` | `number` | Owner user id |
| `groupIds` | `number[]?` | Used when visibility is `groups` |
| `apiEnabled` | `boolean` | Feed enabled flag |
| `apiKey` | `string?` | Filter API key for feeds |
| `icon` | `string?` | UI icon |
| `color` | `string?` | UI color |
| `version` | `number` | Filter format version (`1`) |
| `createdAt` / `updatedAt` | `Date` | Auto timestamps |

### `FilterColumnAP`

`FilterColumnAP` stores one row per selected column:

| Field | Type | Notes |
|---|---|---|
| `id` | `number` | Auto-increment |
| `filter` | `string \| FilterAP` | Relation to `FilterAP` |
| `fieldName` | `string` | Model field id |
| `order` | `number` | Display order |

### `FilterCondition`

```ts
interface FilterCondition {
  id: string;
  field?: string;
  operator?: FilterOperator;
  value?: any;

  logic?: 'AND' | 'OR' | 'NOT';
  children?: FilterCondition[];

  relation?: string;
  relationField?: string;

  customHandler?: string;
  customHandlerName?: string;
  customHandlerParams?: any;

  rawSQL?: string;
  rawSQLParams?: any[];
}
```

Usage map (current code):

| Field | Used in code | Notes |
|---|---|---|
| `id` | yes | Condition identity in UI/backend validation |
| `field` | yes | Standard field filtering path |
| `operator` | yes | Required for query mapping and validation |
| `value` | yes | Operator payload |
| `logic` | yes | Group logic (`AND`/`OR`/`NOT`) in backend/query builder |
| `children` | yes | Nested group conditions in backend/query builder |
| `relation` | yes | Relation filter path for Sequelize |
| `relationField` | yes | Related field in relation filter |
| `customHandler` | yes | Custom handler ID for custom filter execution |
| `customHandlerName` | yes | UI display label (optional, fallbacks exist) |
| `customHandlerParams` | yes | Optional params passed to custom handler execution |
| `rawSQL` | yes | Advanced raw SQL condition path (validated/executed) |
| `rawSQLParams` | yes | Parameters for raw SQL placeholders |

There are no currently dead fields in `FilterCondition`. Some fields are optional or advanced, but all are referenced by runtime code and/or UI formatting.

## Operators

`FilterOperator` currently includes:

- `eq`, `neq`
- `gt`, `gte`, `lt`, `lte`
- `like`, `ilike`, `startsWith`, `endsWith`
- `in`, `notIn`
- `between`
- `today`, `month`, `year`, `monthBetween`, `yearBetween`
- `isNull`, `isNotNull`
- `regex`
- `custom`

Type-specific availability is enforced in `ConditionValidator` and `ModernQueryBuilder`.

### Important UI note

The current filter panel supports a flat condition list (combined with `AND`).
Nested `AND/OR/NOT` groups are supported by backend condition format and query builder, but the standard UI does not provide a group editor.

### Relation filter note

- Relation conditions are available only for Sequelize relation fields.
- In the current UI and validator flow for relation conditions, allowed operators are `eq` and `neq`.

## Visibility and Permissions

Visibility types:

- `private` - owner + admin
- `groups` - users whose groups intersect with `groupIds` + admin
- `public` - all users with access to the model
- `system` - visible to all users with model access; excluded from saved filter list by default

Edit/delete rules:

- admins can edit/delete any filter;
- non-admin users can edit/delete only their own filters.

Creation rules in `POST /filter`:

- `public` is allowed only for admins;
- `groups` is allowed for admins or users with `manage-group-filter-visibility` permission token;
- otherwise visibility is forced to `private`.

When editing someone else's filter, visibility is preserved.

## Backend API

Routes are registered under both `/model/:entityName/...` and `/form/:entityName/...` patterns. In practice, filter UI uses `/model/:model/...`.

### Filter metadata and fields

- `GET /adminizer/model/:model/filter-fields`
  - Returns available fields for filter UI.
  - Applies model filter config: `models.<Model>.filters` (or legacy `modelFilters.<Model>`).
  - Applies `excludeFromFilters`.
  - Always excludes `id`, `ownerId`, `updatedAt`.
  - Relation fields are returned only for Sequelize.
  - Custom filter metadata is returned for Sequelize fields with `customFilter.handlerId`.

- `GET /adminizer/model/:model/filter/locales`
  - Returns i18n strings for filter UI.

### Saved filters

- `GET /adminizer/model/:model/saved-filters`
  - Returns accessible filters with:
  - owner info (`ownerInfo`)
  - computed result count (`resultCount`)

- `POST /adminizer/model/:model/filter`
  - Creates or updates a saved filter.
  - Update mode uses `filterId` in body.
  - Optional: `columns`, `visibility`, `groupIds`, `sortField`, `sortDirection`, `icon`, `color`.
  - For private owner filters, supports `apiEnabled` and `regenerateApiKey`.
  - If same-name filter already exists for the same owner and `filterId` is not provided, returns `409` with `requiresConfirmation: true`.

- `DELETE /adminizer/model/:model/filter/:id`
  - Returns `204` for successful deletion.
  - Also returns `204` for "not found or access denied" to avoid ownership enumeration.

### Temporary filters

- `POST /adminizer/model/:model/filter/apply`
  - Stores temporary filter in server session as `req.session.temporaryFilters[modelName]`.
  - Returns `filterId: "temporary"`.

- `GET /adminizer/model/:model/filter/temporary`
  - Reads temporary filter from server session.

Frontend additionally stores temporary filter meta in `sessionStorage` for local UI state; backend source of truth is server session.

### Columns

- `GET /adminizer/model/:model/columns?filterId=<id|temporary>`
  - Returns `availableColumns` and current `filterColumns`.

- `POST /adminizer/model/:model/filter/:filterId/columns`
  - Replaces column rows for the filter.

### Groups

- `GET /adminizer/groups`
  - Returns group list for group visibility selector.
  - Protected by `manage-group-filter-visibility` permission token.

### Cross-model user filter list

- `GET /adminizer/api/all-user-filters`
  - Returns all filters visible to the current user across models.
  - Supports query params: `search`, `modelName`, `offset`, `limit`.

## Public Feed API

Feed routes:

- `GET /adminizer/api/feed/:apiKey`
- `GET /adminizer/api/feed/:apiKey.:format` (`json` or `xml`)

Requirements:

- filter must be `visibility: 'private'`;
- filter must have `apiEnabled: true`;
- caller must provide `userKey` query parameter;
- auth must be enabled globally (`config.auth.enable`);
- `userKey` must match an existing user API key (`UserAP.apiKey`).

Helper endpoints for user API keys:

- `GET /adminizer/api/user-key`
- `POST /adminizer/api/user-key/regenerate`

## Custom Filter Handlers

Custom handler runtime:

- registry class: `CustomFilterHandler`
- handler base class: `AbstractCustomFilter`
- handler id format: `ModelName.fieldName`

Register handlers programmatically:

```ts
adminizer.customFilterHandler.add(new MyFilterHandler(), { force: true });
```

Attach handler to model field:

```ts
fields: {
  myJson: {
    type: 'jsoneditor',
    customFilter: {
      handlerId: 'Example.myJson'
    }
  }
}
```

Notes:

- custom filter metadata is exposed by `/filter-fields` only for Sequelize fields;
- handler `inputConfig` supports up to 3 inputs;
- in UI, custom condition is serialized with `operator: 'custom'` and `customHandler`.

## Validation and Security Limits

Execution-level limits (`FILTER_SECURITY_LIMITS` in `ModernQueryBuilder`):

| Limit | Value |
|---|---|
| Max nesting depth | 10 |
| Max conditions per group | 100 |
| Max total conditions | 500 |
| Max `IN` values | 1000 |
| Max string length | 10000 |

`ConditionValidator` provides extra condition validation helpers (field/type/operator/value checks and raw SQL pattern checks), but it is a utility class and is not the only enforcement layer. Query execution still validates key constraints in `ModernQueryBuilder`.

## Model Configuration

Global switch:

```ts
filters: {
  enabled: true
}
```

Per-model filter configuration:

```ts
models: {
  Example: {
    model: 'Example',
    title: 'Example',
    filters: {
      enabled: true,
      excludeFromFilters: ['createdAt', 'updatedAt']
    }
  }
}
```

Legacy fallback is still supported:

```ts
modelFilters: {
  Example: {
    excludeFromFilters: ['createdAt']
  }
}
```
