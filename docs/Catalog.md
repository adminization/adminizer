# Catalog

Adminizer catalogs provide a shared tree editor for hierarchical data: navigation menus, product categories, page trees, document structures, and other resources with parent-child relations. The backend owns storage and item behavior; the frontend receives normalized nodes and template metadata.

Catalogs can still be added directly to `CatalogHandler`, but the preferred current pattern is to register catalogs from an `AbstractAdminizerApp` with `ctx.catalog()`. That lets the module register its models, access rights, sidebar links, template components, and event listeners together.

## Runtime Shape

A catalog is an `AbstractCatalog` subclass with:

| Member | Purpose |
|---|---|
| `name` | Human-readable catalog name. |
| `slug` | Route identifier used by `/catalog/:slug/:id?`. Must be unique. |
| `icon` | Material icon name for UI metadata. |
| `id` | Current storage instance id. Set from route params by `FrontendCatalog.setId()`. |
| `itemTypes` | Registered element type instances. Exactly one group item type is allowed. |
| `actionHandlers` | Global catalog actions. Item-specific actions live on item types. |
| `movingGroupsRootOnly` | UI hint that restricts group movement to root level. |

The item shape is defined by `Item`:

```ts
interface Item {
  id: string | number;
  name: string;
  parentId: string | number | null;
  childs?: Item[];
  sortOrder: number;
  icon: string;
  type: string;
  marked?: boolean;
}
```

Use `null` for root-level `parentId`. The frontend adapter converts root `parentId` to `0` for `@minoru/react-dnd-treeview` and converts it back to `null` before writes.

## AbstractCatalog Responsibilities

`AbstractCatalog` delegates all item-specific work to `BaseItem` instances and provides controller-facing helpers:

| Method | Purpose |
|---|---|
| `getChilds(parentId, byItemType?, req?)` | Load children across all item types or one item type, sorted by `sortOrder`. |
| `find(item, req?)` | Resolve one item through its `type`. |
| `createItem(data, req?)` | Create an item through its `type`. Throws if the type is unknown or the handler returns no item. |
| `updateItem(id, type, data, req?)` | Update one catalog node. Throws on unknown type or empty result. |
| `updateModelItems(modelId, type, data, req?)` | Update catalog nodes linked to a source model record. |
| `deleteItem(type, id, req?)` | Delete one item through its item type. |
| `getAddTemplate(item, req)` | Return add-form template metadata for the selected item type. |
| `getEditTemplate(item, id, req, modelId?)` | Return edit-form template metadata. |
| `getActions(items?)` | Return global actions or actions for one selected item type. |
| `handleAction(actionId, items?, data?, req?)` | Execute a catalog action. |
| `getIdList()` | Return valid storage instance ids, for example navigation sections. Default is `[]`. |
| `search(s, hasExtras?, req?)` | Search all item types and build enough parent context for the tree UI. |

`getItemType(type)` is still available, but internal write operations now require a valid item type. This avoids silent `undefined` results and makes template/type mismatches visible as explicit errors.

## Item Types

A catalog item type extends either `AbstractGroup<T>` or `AbstractItem<T>`.

```ts
class MyGroup extends AbstractGroup<MyCatalogItem> {
  readonly type = "group";
  readonly name = "Group";
  readonly allowedRoot = true;
  readonly adminizer = legacyAdminizerHost;
  readonly actionHandlers = [];

  async find(itemId: string | number, catalogId: string, req?: ReqType): Promise<MyCatalogItem> {}
  async create(data: MyCatalogItem, catalogId: string, req?: ReqType): Promise<MyCatalogItem> {}
  async update(itemId: string | number, data: MyCatalogItem, catalogId: string, req?: ReqType): Promise<MyCatalogItem> {}
  async updateModelItems(modelId: string | number, data: any, catalogId: string, req?: ReqType): Promise<MyCatalogItem> {}
  async deleteItem(itemId: string | number, catalogId: string, req?: ReqType): Promise<void> {}
  async getChilds(parentId: string | number | null, catalogId: string, req?: ReqType): Promise<MyCatalogItem[]> {}
  async search(s: string, catalogId: string, req?: ReqType): Promise<MyCatalogItem[]> {}
  async getAddTemplate(req: ReqType): Promise<CatalogTemplate> {}
  async getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<CatalogTemplate> {}
}
```

`BaseItem._getChilds()` and `BaseItem._find()` call `_enrich()` automatically. `_enrich()` writes `type` and `icon` to returned items, so raw records do not need to persist those service fields.

## Templates

`getAddTemplate()` and `getEditTemplate()` return a `CatalogTemplate`:

```ts
interface CatalogTemplate<TData = any> {
  type: string;
  data: TData;
}
```

There are three practical template modes.

### Built-in model form

Return `type: "model"` when the catalog should open the standard Adminizer add/edit form for a model:

```ts
return {
  type: "model",
  data: {
    model: "Product",
  },
};
```

### Legacy dynamic component path

Older catalogs can return a custom component path in `data.path`. The catalog UI imports it directly. This remains supported for compatibility, but new modules should prefer registered catalog template components.

```ts
return {
  type: "component",
  data: {
    path: myCatalogFormUrl,
  },
};
```

Use `adminizer.assetHandler.register(...)` or `ctx.asset(...)` to produce `myCatalogFormUrl`; do not rely on manually copied files under the static assets directory. In development, the registered asset can point at a Vite-served `.tsx` URL such as `/fixture/virtual-catalog/group.tsx`; in production, `AssetHandler` serves the built `.es.js` file through an app asset route.

### Registered catalog template component

Current module-based catalogs should return a stable template type and register the React component in the `templates` array of `ctx.catalog()`:

```ts
// Item type
async getAddTemplate(req: ReqType) {
  return {
    type: "products.product-form",
    data: {
      labels: {
        title: req.i18n.__("Product"),
        save: req.i18n.__("Save"),
      },
    },
  };
}
```

```ts
// App setup
ctx.catalog({
  id: "products",
  templates: [{
    id: "product-form",
    type: "products.product-form",
    component: productTemplatesAsset,
    exportName: "ProductFormTemplate",
  }],
  factory: (runtime) => new ProductsCatalog(runtime),
});
```

When `getCatalog` is called, the controller resolves the registered template components for the catalog slug. The frontend matches `template.type.toLowerCase()` against those records, dynamically imports `component`, and renders `exportName` or the default export.

Template props are documented in [BuildingModules.md](BuildingModules.md#catalog-template-components).

## Controller Lifecycle

`catalogController` handles `/catalog/:slug/:id?`:

1. Resolve catalog by `slug` from `CatalogHandler`.
2. Validate optional `id` against `catalog.getIdList()` when the list is non-empty.
3. Render Inertia page `catalog` for `GET`.
4. For `POST`, `PUT`, and `DELETE`, create `FrontendCatalog`, set catalog id, and dispatch by `_method`.

Supported `_method` values:

| Method | HTTP | Purpose |
|---|---|---|
| `getCatalog` | `POST` | Return root nodes, item types, catalog metadata, toolbar actions, and registered template components. |
| `getAddTemplate` | `POST` | Return add template for selected item type. |
| `getEditTemplate` | `POST` | Return edit template for selected node. |
| `createItem` | `POST` | Create item and normalize returned `parentId` for frontend. |
| `getChilds` | `POST` | Lazy-load children for a node. |
| `search` | `POST` | Return tree nodes for matching items with parent context. |
| `getActions` | `POST` | Return context/tool actions for selected nodes. |
| `updateTree` | `PUT` | Persist drag-and-drop parent/order changes. |
| `updateItem` | `PUT` | Update item or linked model item. |
| `handleAction` | `PUT` | Execute action handler. |
| `getLink` | `PUT` | Resolve link action URL. |
| `getPopUpTemplate` | `PUT` | Resolve external action component. |
| `deleteItem` | `DELETE` | Recursively delete selected item and descendants. |

## Frontend Adapter

`FrontendCatalog` and `FrontendCatalogUtils` convert backend items to tree nodes:

```ts
interface NodeModel<TDataType> {
  text: string;
  droppable: boolean;
  id: string;
  parent: number;
  data?: TDataType;
  children?: NodeModel<TDataType>[];
}
```

Important behavior:

- `getCatalog()` loads root items with `catalog.getChilds(null)`.
- `getChilds()` unwraps `node.data`, treats `0` and missing id as root, and returns child nodes.
- `updateTree()` updates every child under the dropped parent with recalculated `sortOrder` and `parentId`.
- `deleteItem()` recursively deletes children before deleting the selected node.
- `normalizeForFrontend()` converts `parentId: null` to `parentId: 0` and now throws if a catalog handler returns an empty item.

## CatalogHandler

`CatalogHandler` stores two catalog groups:

| Source | API | Use case |
|---|---|---|
| Core/manual catalogs | `catalogHandler.add(catalog)` | Legacy direct registration. |
| App catalogs | `catalogHandler.register(appName, catalog)` | Preferred module-owned registration through `ctx.catalog()`. |

`register()` rejects duplicate app/catalog ids and duplicate catalog slugs. `unregister()`, `disable()`, and `enable()` are used by `AppManager` disposers.

## App-Based Catalog Example

```ts
import {
  AbstractAdminizerApp,
  AbstractCatalog,
  AbstractGroup,
  AbstractItem,
  AppRuntime,
  AppSetupContext,
  Item,
} from "adminizer";

interface TreeItem extends Item {
  url?: string;
}

class MemoryStorage {
  private items = new Map<string | number, TreeItem>();

  async set(item: TreeItem): Promise<TreeItem> {
    this.items.set(item.id, item);
    return item;
  }

  async find(id: string | number): Promise<TreeItem> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Item ${id} was not found`);
    return item;
  }

  async children(parentId: string | number | null, type?: string): Promise<TreeItem[]> {
    return Array.from(this.items.values())
      .filter((item) => item.parentId === parentId && (!type || item.type === type))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async delete(id: string | number): Promise<void> {
    this.items.delete(id);
  }

  async search(query: string, type: string): Promise<TreeItem[]> {
    return Array.from(this.items.values()).filter((item) =>
      item.type === type && item.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

class GroupItem extends AbstractGroup<TreeItem> {
  readonly name = "Group";
  readonly allowedRoot = true;
  readonly adminizer = {} as any;
  readonly actionHandlers = [];

  constructor(private storage: MemoryStorage) {
    super();
  }

  async find(id: string | number): Promise<TreeItem> {
    return this.storage.find(id);
  }

  async create(data: TreeItem): Promise<TreeItem> {
    return this.storage.set({
      ...data,
      id: crypto.randomUUID(),
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder ?? 0,
      icon: this.icon,
      type: this.type,
    });
  }

  async update(id: string | number, data: TreeItem): Promise<TreeItem> {
    return this.storage.set({ ...data, id });
  }

  async updateModelItems(modelId: string | number, data: TreeItem): Promise<TreeItem> {
    return this.update(modelId, data);
  }

  async deleteItem(id: string | number): Promise<void> {
    await this.storage.delete(id);
  }

  async getChilds(parentId: string | number | null): Promise<TreeItem[]> {
    return this.storage.children(parentId, this.type);
  }

  async search(s: string): Promise<TreeItem[]> {
    return this.storage.search(s, this.type);
  }

  async getAddTemplate(req: ReqType) {
    return {
      type: "demo.group-template",
      data: { labels: { title: req.i18n.__("Title"), save: req.i18n.__("Save") } },
    };
  }

  async getEditTemplate(id: string | number, catalogId: string, req: ReqType) {
    return {
      type: "demo.group-template",
      data: { item: await this.find(id), labels: { title: req.i18n.__("Title"), save: req.i18n.__("Save") } },
    };
  }
}

class LinkItem extends AbstractItem<TreeItem> {
  readonly type = "link";
  readonly name = "Link";
  readonly icon = "insert_link";
  readonly allowedRoot = true;
  readonly adminizer = {} as any;
  readonly actionHandlers = [];

  constructor(private storage: MemoryStorage) {
    super();
  }

  async find(id: string | number): Promise<TreeItem> { return this.storage.find(id); }
  async create(data: TreeItem): Promise<TreeItem> { return this.storage.set({ ...data, id: crypto.randomUUID(), parentId: data.parentId ?? null, sortOrder: data.sortOrder ?? 0, icon: this.icon, type: this.type }); }
  async update(id: string | number, data: TreeItem): Promise<TreeItem> { return this.storage.set({ ...data, id }); }
  async updateModelItems(modelId: string | number, data: TreeItem): Promise<TreeItem> { return this.update(modelId, data); }
  async deleteItem(id: string | number): Promise<void> { await this.storage.delete(id); }
  async getChilds(parentId: string | number | null): Promise<TreeItem[]> { return this.storage.children(parentId, this.type); }
  async search(s: string): Promise<TreeItem[]> { return this.storage.search(s, this.type); }
  async getAddTemplate() { return { type: "demo.link-template", data: {} }; }
  async getEditTemplate(id: string | number) { return { type: "demo.link-template", data: { item: await this.find(id) } }; }
}

class DemoCatalog extends AbstractCatalog {
  readonly name = "Demo Catalog";
  readonly slug = "demo";
  readonly icon = "account_tree";
  readonly actionHandlers = [];

  constructor(_runtime: AppRuntime) {
    const storage = new MemoryStorage();
    super({ accessRightsHelper: { registerToken: () => undefined } } as any, [
      new GroupItem(storage),
      new LinkItem(storage),
    ]);
  }

  async getIdList(): Promise<string[]> {
    return ["main"];
  }
}

export class DemoCatalogApp extends AbstractAdminizerApp<{ routePrefix: string }> {
  readonly name = "demo-catalog";
  readonly version = "1.0.0";
  declare readonly config: { routePrefix: string };

  constructor(config: { routePrefix: string }) {
    super();
    this.config = config;
  }

  setup(ctx: AppSetupContext): void {
    ctx.config({
      navbar: {
        additionalLinks: [{
          id: "demo-catalog",
          type: "self",
          link: `${this.config.routePrefix}/catalog/demo/main`,
          title: "Demo Catalog",
          icon: "account_tree",
        }],
      },
    });

    ctx.catalog({
      id: "demo",
      factory: (runtime) => new DemoCatalog(runtime),
    });
  }
}
```

Enable after Adminizer initialization:

```ts
await adminizer.init(adminpanelConfig);
await adminizer.appManager.enable(new DemoCatalogApp({ routePrefix: adminpanelConfig.routePrefix }));
```

## Navigation As A Catalog Module

Navigation is no longer part of Adminizer core config. The fixture implements it as an app module in `fixture/apps/navigation`:

- `NavigationApp.ts` registers access rights, assets, template components, a runtime storage model, model access, navbar links, the catalog factory, and a `model:updated` listener.
- `NavigationCatalog.ts` implements `AbstractCatalog`, item types, and in-memory section storages backed by the runtime model.
- `NavigationCatalogTemplates.tsx` implements add/edit forms registered through `CatalogTemplateComponentHandler`.

Use this fixture as the current reference for multi-section catalog modules.
