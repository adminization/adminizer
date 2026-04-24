# Filters in Adminizer

The filtering system allows creating, saving, and applying filters to model data. Filters support private/public access, condition grouping, sorting, and column display customization.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Data Models](#data-models)
3. [Filter Operators](#filter-operators)
4. [Filter Visibility](#filter-visibility)
5. [Backend API](#backend-api)
6. [Frontend Components](#frontend-components)
7. [Temporary Filters](#temporary-filters)
8. [Column Management](#column-management)
9. [Validation and Security](#validation-and-security)
10. [Filter Migration](#filter-migration)
11. [Custom Field Handlers](#custom-field-handlers)
12. [Public Feed API](#public-feed-api)
13. [Programmatic Filter Creation](#programmatic-filter-creation)

---

## Architecture

The filter system consists of the following components:

| Component | Location | Description |
|-----------|----------|-------------|
| `FilterAP` | `src/models/FilterAP.ts` | Filter data model |
| `FilterColumnAP` | `src/models/FilterColumnAP.ts` | Column configuration model |
| `FilterService` | `src/lib/filters/FilterService.ts` | Main filtering service |
| `FilterBuilder` | `src/lib/filters/FilterBuilder.ts` | Fluent API for filter creation |
| `FilterMigrator` | `src/lib/filters/FilterMigrator.ts` | Filter schema migration |
| `ConditionValidator` | `src/lib/filters/ConditionValidator.ts` | Condition validation |
| `CustomFieldHandler` | `src/lib/filters/CustomFieldHandler.ts` | Complex field handlers |
| `ModernQueryBuilder` | `src/lib/query-builder/ModernQueryBuilder.ts` | Query building |

---

## Data Models

### FilterAP

The main filter model:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Filter UUID |
| `name` | `string` | Filter name |
| `description` | `string?` | Description |
| `modelName` | `string` | Model name |
| `slug` | `string` | Unique identifier |
| `conditions` | `FilterCondition[]` | Filter conditions |
| `sortField` | `string?` | Sort field |
| `sortDirection` | `'ASC' \| 'DESC'?` | Sort direction |
| `selectedFields` | `string[]?` | Selected display fields |
| `ownerId` | `number?` | Owner ID |
| `visibility` | `FilterVisibility` | Visibility type |
| `groupIds` | `number[]?` | Group IDs (for `groups`) |
| `apiKey` | `string?` | Public API key |
| `apiEnabled` | `boolean` | Public API enabled |
| `icon` | `string?` | Icon |
| `color` | `string?` | Color |
| `metadata` | `object?` | Additional metadata |
| `schemaVersion` | `number` | Schema version (current: `1`) |

### FilterCondition

A single filter condition structure:

```typescript
interface FilterCondition {
    id: string;                      // Condition UUID
    field?: string;                  // Field name
    operator?: FilterOperator;       // Operator
    value?: any;                     // Value

    // Nested conditions (groups)
    logic?: 'AND' | 'OR' | 'NOT';   // Group logic
    children?: FilterCondition[];    // Child conditions

    // For relations
    relation?: string;               // Relation name
    relationField?: string;          // Relation field

    // Custom handlers
    customHandler?: string;          // Handler ID
    customHandlerParams?: any;       // Handler parameters

    // Raw SQL
    rawSQL?: string;                 // Raw SQL condition
    rawSQLParams?: any[];            // SQL parameters
}
```

### Relation Conditions (Sequelize)

Relation conditions are supported in the filter UI for Sequelize models.

- Supported relation types: `association`, `association-many`
- Condition format: `relation + relationField + operator + value`
- Allowed operators for relation conditions: `eq`, `neq`
- Relation field picker includes only simple fields from the related model:
  - included: string, text, number, integer, float, boolean, date, datetime, select, select-many, etc.
  - excluded: `association`, `association-many`, `json`, `jsoneditor`, `object`, `array`
- Waterline relation filtering is not supported in filter conditions.

### FilterColumnAP

Column configuration for a filter:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID |
| `filterId` | `string` | Related filter ID |
| `columnConfigs` | `object` | Per-column configuration (visibility, order, width, editability) |

---

## Filter Operators

| Operator | Description | Applicable Types |
|----------|-------------|------------------|
| `eq` | Equals | All |
| `neq` | Not equals | All |
| `gt` | Greater than | number, integer, float, date, datetime |
| `gte` | Greater than or equal | number, integer, float, date, datetime |
| `lt` | Less than | number, integer, float, date, datetime |
| `lte` | Less than or equal | number, integer, float, date, datetime |
| `like` | LIKE %value% | string, text |
| `ilike` | Case-insensitive LIKE | string, text |
| `startsWith` | LIKE value% | string, text |
| `endsWith` | LIKE %value | string, text |
| `in` | IN (list) | All |
| `notIn` | NOT IN (list) | All |
| `between` | BETWEEN val1 AND val2 | number, integer, float, date, datetime |
| `isNull` | IS NULL | All |
| `isNotNull` | IS NOT NULL | All |
| `regex` | Regular expression | string, text |
| `custom` | Custom handler | Depends on handler |

---

## Filter Visibility

### Visibility Types

| Type | Description | Who can see |
|------|-------------|-------------|
| `private` | Private filter | Owner only |

---

## Recent UI Behavior Updates

- Saved filters are now auto-applied immediately after a successful save in the filter dialog.
- Updated saved filters are also auto-applied immediately after saving on the edit slide.
- The auto-apply step reuses the same frontend flow as selecting a saved filter from the saved filters list.
- This keeps URL state (`filterId`) and filter panel state synchronized after save.
| `groups` | Group filter | Users in selected groups |
| `public` | Public filter | All model users |
| `system` | System filter | All (not editable) |

### Permissions

| Role | Creation | Edit | Delete |
|------|----------|------|--------|
| Admin (`isAdministrator: true`) | Any visibility | All filters | All filters |
| Regular user | `private` only | Own `private` only | Own `private` only |

### Notes

- When editing someone else's filter, visibility is preserved (cannot be changed)
- Group filters are visible to all group members, but only admins can edit them
- System filters are created programmatically and are not editable by users

---

## Backend API

### Get filter fields

```
GET /adminizer/model/:model/filter-fields
```

Returns available fields for filtering on a model.

Notes for relation fields:

- System fields (`id`, `ownerId`, `updatedAt`) are excluded.
- `modelFilters.<Model>.excludeFromFilters` is applied before field exposure.
- If `includeInFilters` is set, it acts as a whitelist over the already filtered set.
- Relation filters are exposed only for Sequelize.
- Custom filters are exposed only for Sequelize fields with `customFilter` in field config.
- For custom fields, API returns additional metadata:
  - `isCustomFilter: true`
  - `customFilterHandlerId`
  - `customFilterLabel` (optional)

### Saved filters

```
GET /adminizer/model/:model/saved-filters
```

Returns the list of saved filters for a model, including owner info and result counts.

### Create/update filter

```
POST /adminizer/model/:model/filter
```

**Request body:**
```json
{
    "name": "Name",
    "description": "Description",
    "conditions": [...],
    "sortField": "title",
    "sortDirection": "ASC",
    "visibility": "private",
    "groupIds": [1, 2],
    "icon": "filter",
    "color": "blue",
    "apiKey": "optional-key",
    "apiEnabled": false
}
```

### Delete filter

```
DELETE /adminizer/model/:model/filter/:id
```

### Apply temporary filter

```
POST /adminizer/model/:model/filter/apply
```

**Request body:**
```json
{
    "name": "Temporary filter",
    "conditions": [...],
    "temporary": true
}
```

Stores the filter in the session for temporary use.

### User groups

```
GET /adminizer/groups
```

Returns all system groups (admin only).

### Model columns

```
GET /adminizer/model/:model/columns
GET /adminizer/model/:model/filter/:filterId/columns
POST /adminizer/model/:model/filter/:filterId/columns
```

Manage column configuration for a filter.

### Public feed

```
GET /adminizer/api/feed/:apiKey
```

Public API for exporting filter data in Atom/JSON format.

---

## Frontend Components

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| `FilterPanel` | `filter-panel.tsx` | Main filter panel component (~2375 lines). Manages dialogs for creating/editing/applying filters. |
| `SavedFiltersList` | `filter-panel-saved-filters.tsx` | Saved filters list with icons, visibility badges, and result counts. |
| `GroupVisibilitySelector` | `group-visibility-selector.tsx` | Group picker for group filters. |
| `TableToolbar` | `table-toolbar.tsx` | Table toolbar with filter dialog button. |

### UI Flow

1. **Open dialog** — "Filters" button in toolbar opens `FilterDialog`
2. **Select saved filter** — clicking a filter applies it
3. **Create new filter** — "Add filter" button → `FilterConditionsDialog`
4. **Configure conditions** — add/remove conditions, select fields/operators/values
5. **Apply** — filter is applied to data via temporary `filterId`
6. **Save** — "Save filter" button → `SaveFilterMetaDialog` → save to DB

### Supported Value Types

- **Strings** — text input
- **Numbers** — numeric input
- **Boolean** — Yes/No toggle
- **Date/Time** — date picker
- **Select** — dropdown with model options
- **Multi-select** — multiple selection
- **JSON fields** — via custom field handlers

---

## Temporary Filters

Temporary filters are not saved to the database; they are stored in the user's session:

1. User creates a filter with conditions
2. Filter is applied to data (`filterId=temporary`)
3. Conditions are stored in `sessionStorage` for the backend
4. A "Save filter" button appears in the toolbar
5. Clicking opens the metadata save dialog (name, description, icon, color, visibility)
6. After saving, the filter appears in the saved filters list

**Limitations:**
- Temporary filters do not persist between sessions
- You must click "Save filter" to persist the filter

---

## Column Management

Each saved filter can have its own column configuration:

- **Visibility** — show/hide column
- **Order** — column display order
- **Width** — fixed column width
- **Editability** — inline cell editing enabled/disabled

Configuration is stored in `FilterColumnAP` and applied when displaying the table.

---

## Validation and Security

### ConditionValidator

Validates filter conditions:

- Field existence in the model
- Operator validity per field type
- Value type and format
- Security limits:
  - Maximum nesting depth
  - Maximum conditions per group
  - Maximum `IN` values
  - Maximum string length
- SQL injection detection for raw SQL conditions

### Security Limits

| Parameter | Value |
|-----------|-------|
| Maximum nesting depth | 5 |
| Maximum conditions per group | 20 |
| Maximum `IN` values | 1000 |
| Maximum string length | 10000 |

---

## Filter Migration

`FilterMigrator` ensures backward compatibility when the filter schema changes:

- Current schema version: `1`
- Automatic migration of old versions
- Post-migration condition validation
- Condition sanitization (remove invalid conditions)
- Check for removed model fields

---

## Custom Field Handlers

`CustomFieldHandler` allows registering handlers for complex fields:

- JSON fields
- Computed fields
- Full-text search
- Geo-spatial queries

### Config-based loading (recommended)

Use `filters.customHandlersPath` in `adminConfig` to load one or many handler files on startup:

```typescript
{
    filters: {
        customHandlersPath: [
            'fixture/filters/customFilterHandlers.ts'
        ]
    }
}
```

Each file must export a default function. Adminizer calls it during init.
If a file is missing or has invalid export, a warning is logged and startup continues.

### Registering a handler

```typescript
import { CustomFieldHandler } from 'adminizer';

CustomFieldHandler.register('myHandler', {
    buildCondition: (operator, value, params) => {
        // Returns criteria/rawSQL/inMemory
        return { criteria: { title: value } };
    },
    validate: (value) => {
        // Value validation, throw error if invalid
        if (!value) throw new Error('Value required');
    }
});
```

### Field-level config

Enable custom filter mode on a field:

```typescript
fields: {
    json: {
        type: 'jsoneditor',
        customFilter: {
            handlerId: 'Example.json',
            label: 'Custom filtering'
        }
    }
}
```

UI behavior for custom filter fields:

- Condition selector shows only one option (`Custom filtering`)
- A single value input is rendered
- Saved condition format:

```json
{
  "id": "cond-1",
  "customHandler": "Example.json",
  "operator": "custom",
  "value": "search text"
}
```

---

## Public Feed API

Filters with `apiEnabled: true` and a configured `apiKey` are publicly accessible:

- **Atom XML** — for RSS readers
- **JSON** — for programmatic access

### Configuration

```typescript
{
    name: "My public filter",
    modelName: "Example",
    conditions: [...],
    apiKey: "my-secret-key",
    apiEnabled: true
}
```

### Access

```
GET /adminizer/api/feed/my-secret-key
```

Public feeds bypass auth and use the `apiKey` for access control.

---

## Programmatic Filter Creation

### FilterBuilder (Fluent API)

```typescript
import { FilterBuilder } from 'adminizer';

await FilterBuilder
    .forModel('Example')
    .named('Active records')
    .where('sort', 'eq', true)
    .andWhere('title', 'ilike', 'test')
    .sortBy('createdAt', 'DESC')
    .asPublic()
    .save(user);
```

### Registration via config

```typescript
import { FilterBuilder, FilterDefinition } from 'adminizer';

const filters: FilterDefinition[] = [
    {
        name: 'Active',
        modelName: 'Example',
        description: 'Shows only active records',
        conditions: [
            { id: '1', field: 'sort', operator: 'eq', value: true }
        ],
        visibility: 'system',
        icon: 'check',
        color: 'green'
    }
];

FilterBuilder.registerFilters(filters);
```

### Lifecycle Hooks

```typescript
FilterBuilder.on('beforeCreate', async (filter, context) => {
    console.log('Creating filter:', filter.name);
    return filter;
});

FilterBuilder.on('afterCreate', async (filter, context) => {
    console.log('Created filter:', filter.id);
});
```

Available hooks: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`, `beforeExecute`, `afterExecute`.

---

## Model Integration

To enable filters in model configuration:

```typescript
{
    models: {
        Example: {
            model: ExampleModel,
            filtersEnabled: true,
            modelFilters: {
                excludeFromFilters: ['disabled_text', 'editor'],  // Exclude fields
                includeInFilters: ['title', 'sort'],               // Whitelist
            }
        }
    }
}
```
