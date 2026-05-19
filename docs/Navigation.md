# Navigation Catalog

## Abstract

The Navigation Catalog is a built-in Adminizer system for managing hierarchical site navigation menus — header, footer, or any other sections. It is built on top of the [Catalog](Catalog.md) infrastructure and adds specialized item types: records from any configured model (linked via a URL template), free-form groups with custom metadata fields, and plain external links.

**Why is this needed:**
- **Visual tree editor**: drag-and-drop ordering and nesting in the admin panel UI
- **Multiple sections**: manage header, footer, and any other menus independently in one place
- **Mixed content**: model records, groups, and external links coexist in the same tree
- **URL templating**: item URLs are generated automatically from model record fields
- **Persistent storage**: the entire tree is stored as JSON in the database, one row per section
- **Ready-made API**: read the navigation tree from your frontend application via a single query

**Main features:**
- Add records from any configured model as navigation items
- Add folder-like groups with custom extra fields
- Add manual external links
- Drag-and-drop reordering and re-nesting
- Per-item `visible` and `targetBlank` flags
- Full-text search across all items
- No extra code required — enabled entirely through `adminizerConfig.ts`

## Overview

Navigation is configured in `adminizerConfig.ts` under the `navigation` key. Adminizer automatically creates one [StorageService](#storageservice) per section, registers the `Navigation` catalog, and exposes the editor at `/adminizer/catalog/navigation/:section`.

The tree is persisted in the `navigationap` database table — one row per section. Each row stores the full tree as a JSON blob. On every change (create, update, move, delete) the tree is rebuilt in memory and written back to the database.

To consume the navigation in a frontend application, read the `navigationap` record for the desired section and use the `tree` field directly.

## Configuration

Add the `navigation` key to `adminizerConfig.ts`:

```typescript
// adminizerConfig.ts
import { AdminpanelConfig } from 'adminizer';

const config: AdminpanelConfig = {
  routePrefix: '/adminizer',

  navigation: {
    // Sections to manage. Each creates a separate tree and a UI page:
    // /adminizer/catalog/navigation/header
    // /adminizer/catalog/navigation/footer
    sections: ['header', 'footer'],

    // Model records that can be added as navigation items.
    // The title appears in the "add item" dropdown.
    // urlPath is a JS template string: use ${data.record.<field>} to reference record fields.
    items: [
      {
        title: 'Category',
        model: 'Category',
        urlPath: '/catalog/${data.record.slug}',
      },
      {
        title: 'Article',
        model: 'Article',
        urlPath: '/blog/${data.record.slug}',
      },
    ],

    // Extra fields added to NavigationGroup items.
    // Useful for storing CSS classes, anchors, or any group-level metadata.
    groupField: [
      { name: 'link',      label: 'URL',       required: false },
      { name: 'css_class', label: 'CSS class', required: false },
    ],

    // Optional: allow content items (model records) to be placed
    // directly at the root level, not only inside groups.
    allowContentInGroup: true,

    // Optional: restrict group drag-and-drop to the root level only.
    movingGroupsRootOnly: false,
  },
};
```

No other registration is needed. Adminizer calls `bindNavigation()` automatically during `init()`.

## Item types

### NavigationItem — model record

Links a specific record from a configured model. The URL is generated from the `urlPath` template at the moment the item is added.

```
urlPath: '/blog/${data.record.slug}'
         └─ evaluated with data.record = the chosen model record
```

The item stores:
- `modelId` — the source record's id
- `urlPath` — the evaluated URL (frozen at creation time)
- `name` — taken from the record's `title` or `name` field
- `targetBlank` — open in a new tab
- `visible` — show/hide on the frontend

### NavigationGroup — folder

A container node. Can hold any other item type as children. Supports custom fields defined via `groupField` in the config.

### LinkItem — external link

A plain link with a manually entered URL. Useful for external resources, anchors, or pages not covered by any model.

## Admin panel UI

The catalog editor is available at:
```
/adminizer/catalog/navigation/header
/adminizer/catalog/navigation/footer
```

The editor provides:
- A tree view with drag-and-drop reordering and re-nesting
- A section switcher (tabs for `header`, `footer`, etc.)
- Add / edit / delete for each item type
- Full-text search with automatic ancestor display

## Database

The navigation tree is stored in the `navigationap` table, created by migration `20240804191001-added-navigationap.js`.

| column      | type   | description                                    |
|-------------|--------|------------------------------------------------|
| `id`        | text   | primary key                                    |
| `label`     | text   | section name (`header`, `footer`, …), unique   |
| `tree`      | json   | full tree with all children nested             |
| `createdAt` | bigint |                                                |
| `updatedAt` | bigint |                                                |

One row per section. The `tree` field contains the full nested structure rebuilt on every write.

### Tree node shape

```typescript
interface NavItem {
  id: string;            // UUID assigned at creation
  name: string;          // Display label
  type: string;          // 'category' | 'group' | 'link'
  parentId: string | null;
  sortOrder: number;
  urlPath?: string;      // NavigationItem only
  modelId?: string | number; // NavigationItem only
  targetBlank?: boolean;
  visible?: boolean;
  children: NavItem[];   // Nested children (built at read time)
}
```

## Consuming the navigation in a frontend app

Read the `navigationap` record for the section you need. The `tree` field is ready to use — no extra processing required.

### Express.js example

```typescript
// index.ts
mainApp.get('/api/navigation', async (req, res) => {
  try {
    const navigationModel = adminizer.modelHandler
      .internal('navigation')
      .get('NavigationAP');

    const header = await navigationModel.findOne({
      where: { label: 'header' }
    });

    const footer = await navigationModel.findOne({
      where: { label: 'footer' }
    });

    res.json({
      header: header?.tree ?? [],
      footer: footer?.tree ?? [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Example response

```json
{
  "header": [
    {
      "id": "a1b2c3d4",
      "name": "Catalog",
      "type": "group",
      "parentId": null,
      "sortOrder": 0,
      "visible": true,
      "children": [
        {
          "id": "e5f6g7h8",
          "name": "Electronics",
          "type": "category",
          "parentId": "a1b2c3d4",
          "sortOrder": 0,
          "urlPath": "/catalog/electronics",
          "modelId": 12,
          "targetBlank": false,
          "visible": true,
          "children": []
        }
      ]
    },
    {
      "id": "i9j0k1l2",
      "name": "About",
      "type": "link",
      "parentId": null,
      "sortOrder": 1,
      "urlPath": "/about",
      "visible": true,
      "children": []
    }
  ],
  "footer": []
}
```

### Next.js / React example

```typescript
// lib/navigation.ts
export async function getNavigation() {
  const res = await fetch(`${process.env.API_URL}/api/navigation`);
  const data = await res.json();
  return data; // { header: NavItem[], footer: NavItem[] }
}

// components/Header.tsx
import { getNavigation } from '@/lib/navigation';

export default async function Header() {
  const { header } = await getNavigation();

  return (
    <nav>
      {header.filter(item => item.visible).map(item => (
        <NavNode key={item.id} item={item} />
      ))}
    </nav>
  );
}

function NavNode({ item }) {
  return (
    <div>
      {item.urlPath ? (
        <a href={item.urlPath} target={item.targetBlank ? '_blank' : undefined}>
          {item.name}
        </a>
      ) : (
        <span>{item.name}</span>
      )}
      {item.children?.length > 0 && (
        <ul>
          {item.children.filter(c => c.visible).map(child => (
            <li key={child.id}>
              <NavNode item={child} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## StorageService

`StorageService` (`src/lib/catalog/Navigation.ts`) manages a single navigation section. It holds an in-memory `Map<id, NavItem>` and syncs it to the database on every write.

**Important:** the catalog always reads from the in-memory map, never from the database directly. The database is only the persistence layer — writes go memory → DB, reads come from memory only. Any seed or programmatic write must go through `StorageService`, not via raw ORM calls.

**Key methods:**

| Method | Description |
|---|---|
| `ready` | Promise that resolves when `initModel()` has finished. Await before any programmatic writes. |
| `initModel()` | Called in the constructor. Loads the existing tree from DB into memory, or creates an empty DB record. |
| `buildTree()` | Assembles the flat in-memory map into a nested tree, sorted by `sortOrder`. |
| `populateFromTree(tree)` | Recursively loads a tree structure into the in-memory map. |
| `setElement(id, data)` | Add or update an item, then persist the rebuilt tree to DB. |
| `findElementsByParentId(parentId, type?)` | Query items by parent, optionally filtered by type. |
| `saveToDB()` | Rebuild the tree from memory and write the JSON to the `navigationap` row. |

`StorageServices.ready()` waits for all sections at once:

```typescript
await adminizer.storageServices.ready(); // waits for header, footer, etc.
```

## Seeding navigation programmatically

Because the catalog works from memory, seed data must be loaded into `StorageService` — not written directly to the database.

**The correct pattern:**

```typescript
// After adminizer.init() — wait for all StorageServices to finish loading
const navCatalog = adminizer.catalogHandler.getCatalog('navigation') as any;
await navCatalog.storageServices.ready();

const storage = navCatalog.storageServices.get('header');

// Only seed if the section is empty
const existing = await storage.findElementsByParentId(null, null);
if (existing.length === 0) {
  await storage.populateFromTree([
    {
      id: 'group-1',
      name: 'Docs',
      type: 'group',
      parentId: null,
      sortOrder: 0,
      icon: 'folder',
      visible: true,
      children: [
        {
          id: 'link-1',
          name: 'Install',
          type: 'link',
          parentId: 'group-1',
          sortOrder: 0,
          icon: 'link',
          urlPath: 'https://example.com/docs/install',
          targetBlank: true,
          visible: true,
          children: [],
        },
      ],
    },
  ]);
  await storage.saveToDB();
}
```

**Why direct DB writes do not work:** the catalog never reads from the database after startup — only from `storageMap`. Writing to the `navigationap` table via ORM has no effect until the next server restart.

## Minimal seed example

```typescript
// index.ts — after adminizer.init()
const navCatalog = adminizer.catalogHandler.getCatalog('navigation') as any;
await navCatalog.storageServices.ready();

const storage = navCatalog.storageServices.get('header');
const existing = await storage.findElementsByParentId(null, null);
if (existing.length === 0) {
  await storage.populateFromTree([
    { id: '1', name: 'Home',  type: 'link', parentId: null, sortOrder: 0, icon: 'link', urlPath: '/',             targetBlank: false, visible: true, children: [] },
    { id: '2', name: 'Docs',  type: 'link', parentId: null, sortOrder: 1, icon: 'link', urlPath: '/docs',         targetBlank: false, visible: true, children: [] },
    { id: '3', name: 'GitHub',type: 'link', parentId: null, sortOrder: 2, icon: 'link', urlPath: 'https://github.com', targetBlank: true,  visible: true, children: [] },
  ]);
  await storage.saveToDB();
}
```

## Access rights

The Navigation catalog registers access right tokens automatically:

| Token | Grants access to |
|---|---|
| `catalog-navigation` | All navigation sections |
| `catalog-navigation-header` | Header section only |
| `catalog-navigation-footer` | Footer section only |

Assign these tokens to groups in `adminizerConfig.ts` or via the access rights UI.

## urlPath templates

`urlPath` is evaluated as a JavaScript template literal at the moment a navigation item is created:

```typescript
// Config:
urlPath: '/blog/${data.record.slug}'

// At creation time Adminizer evaluates:
const urlPath = eval('`' + configuredUrlPath + '`');
// where data.record is the chosen model record
```

The evaluated URL is stored statically on the item. If the source record changes later, call `updateModelItems()` to propagate the new URL to all navigation items that reference it.

You can use any field from the record:

```typescript
urlPath: '/products/${data.record.category}/${data.record.id}'
urlPath: '/pages/${data.record.slug}?lang=en'
urlPath: 'https://external.com/${data.record.externalId}'
```

## Full configuration reference

```typescript
navigation: {
  // Required. List of section identifiers.
  sections: string[]

  // Required. Model types available as navigation items.
  items: Array<{
    title: string                           // Label in the "add" dropdown
    model: string                           // Model name as defined in adminizerConfig models
    urlPath: string | ((v: any) => string) // URL template or function
  }>

  // Optional. Extra fields on group nodes.
  groupField: Array<{
    name: string
    label: string
    required: boolean
  }>

  // Optional. Custom storage model name. Defaults to 'NavigationAP'.
  model?: string

  // Optional. Allow model items at the root level (outside groups).
  allowContentInGroup?: boolean

  // Optional. Restrict group drag-and-drop to root level only.
  movingGroupsRootOnly?: boolean
}
```
