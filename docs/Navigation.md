# Navigation Module

Navigation is implemented as an Adminizer app module in the fixture: `fixture/apps/navigation`. Use that implementation as the reference for building project-specific navigation editors.

The module is built on the catalog system and registers its own runtime model, catalog, template components, access token, sidebar links, and synchronization listener.

## Fixture Files

| File | Purpose |
|---|---|
| `fixture/apps/navigation/NavigationApp.ts` | App entry point. Registers all module resources through `AppSetupContext`. |
| `fixture/apps/navigation/navigationConfig.ts` | Example module config used by the fixture. |
| `fixture/apps/navigation/NavigationTypes.ts` | Config interfaces. |
| `fixture/apps/navigation/NavigationModel.ts` | Runtime model name and schema for persisted trees. |
| `fixture/apps/navigation/NavigationCatalog.ts` | Catalog, storage, item types, and CRUD logic. |
| `fixture/apps/navigation/NavigationCatalogTemplates.tsx` | React add/edit templates for model links, groups, and manual links. |
| `fixture/apps/navigation/vite.config.module.ts` | Vite build for catalog template components. |

## Enabling The Module

The fixture enables navigation after `adminizer.init()` and only for Sequelize:

```ts
await adminizer.init(adminpanelConfig);

await adminizer.appManager.enable(new NavigationApp({
  ...navigationAppConfig,
  sync: true,
}));
```

Sequelize is the recommended/default ORM path. TypeORM support in the project is experimental, and the fixture does not currently enable the navigation app for TypeORM.

## Configuration

`NavigationAppConfig` is defined in `fixture/apps/navigation/NavigationTypes.ts`:

```ts
interface NavigationAppConfig {
  model?: string;
  routePrefix?: string;
  componentFile?: string;
  devComponentUrl?: string;
  sections: string[];
  groupField: Array<{
    name: string;
    required: boolean;
    label: string;
  }>;
  allowContentInGroup?: boolean;
  items: Array<{
    model: string;
    title: string;
    urlPath: string | ((value: any) => string);
  }>;
  movingGroupsRootOnly?: boolean;
  sync?: boolean;
}
```

Fixture config example:

```ts
import { routePrefix } from "../../adminizerConfig";
import type { NavigationAppConfig } from "./NavigationTypes";

export const navigationAppConfig: NavigationAppConfig = {
  routePrefix,
  items: [
    {
      title: "Category",
      model: "Category",
      urlPath: "/catalog/category/${data.record.slug}",
    },
    {
      title: "Example",
      model: "Example",
      urlPath: `${routePrefix}/model/Example/\${data.record.id}`,
    },
  ],
  sections: ["header", "footer"],
  groupField: [
    { name: "link", label: "Link", required: false },
    { name: "css_class", label: "CSS class", required: false },
  ],
};
```

## What `NavigationApp` Registers

`NavigationApp.setup(ctx)` registers these resources:

| Resource | Code path | Details |
|---|---|---|
| Access right | `ctx.accessRight()` | Token `catalog-navigation`. Used by navigation sidebar links. |
| Template asset | `ctx.asset()` | Serves `NavigationCatalogTemplates.es.js` in production or `NavigationCatalogTemplates.tsx` in dev. |
| Catalog template components | `ctx.catalogTemplateComponent()` | Maps `navigation.model-link`, `navigation.group`, and `navigation.link` to React exports. |
| Runtime model | `ctx.model()` | Registers the storage model. Default name is `Navigation`. |
| Model access | `ctx.modelAccess()` | Allows the app to read/write the storage model and source content models. |
| Config layer | `ctx.config()` | Hides the storage model from navbar/list UI and adds one sidebar link per section. |
| Catalog | `ctx.catalog({ factory })` | Creates `NavigationCatalog`, waits for `catalog.ready()`, then registers it. |
| Listener | `ctx.listener("model:updated")` | Updates navigation items when a linked model record changes. |

Navigation setup is owned by the app module, not by core initialization.

## Storage Model

The default runtime model name is `Navigation` (`navigationModelName`). The schema is:

```ts
export const navigationSchema = {
  id: {
    type: "number",
    autoIncrement: true,
    primaryKey: true,
  },
  label: {
    type: "string",
    required: true,
    unique: true,
  },
  tree: {
    type: "json",
    required: true,
  },
};
```

`ctx.model({ name: this.config.model, schema: navigationSchema, sync: this.config.sync })` registers it through the active ORM adapter. In fixture usage, `sync: true` creates/synchronizes the model automatically for local development.

The storage model is hidden from the regular model UI by a config layer:

```ts
ctx.config({
  models: {
    [this.config.model.toLowerCase()]: {
      add: false,
      navbar: { visible: false },
      remove: false,
      // list fields hidden as needed
    },
  },
});
```

## Catalog URLs

For each configured section, `NavigationApp` adds a navbar link:

```ts
`${routePrefix}/catalog/navigation/${section}`
```

Example fixture URLs:

```text
/adminizer/catalog/navigation/header
/adminizer/catalog/navigation/footer
```

The catalog controller validates `section` with `NavigationCatalog.getIdList()`, which returns `config.sections`.

## NavigationCatalog

`NavigationCatalog` extends `AbstractCatalog` and builds item types from module config:

- one `NavigationItem` per configured source model;
- one `NavigationGroup` for groups;
- one `LinkItem` for manual links.

```ts
const items: BaseItem<NavItem>[] = config.items.map((configElement) => new NavigationItem(
  runtime,
  configElement.title,
  configElement.model,
  config.model,
  configElement.urlPath as string,
  storageServices
));

items.push(new NavigationGroup(config.groupField, storageServices));
items.push(new LinkItem(storageServices));
```

The catalog has `slug = "navigation"`, `name = "Navigation"`, and `movingGroupsRootOnly` copied from config.

## Storage Lifecycle

`NavigationStorageServices` owns one `NavigationStorage` per section. Each storage:

1. Loads the row with `label = section` from the runtime navigation model.
2. Creates an empty row if it does not exist.
3. Populates an in-memory `Map<id, NavItem>` from the persisted tree.
4. Serves catalog reads from memory.
5. Rebuilds and writes the full tree JSON to the model on each write.

Important methods:

| Method | Purpose |
|---|---|
| `ready` | Promise resolved when initial model loading is done. |
| `buildTree()` | Convert flat in-memory map to nested `children` tree sorted by `sortOrder`. |
| `populateFromTree(tree)` | Load persisted or seeded tree into memory. |
| `setElement(id, item, init?)` | Add/update item and save to DB unless `init` is true. |
| `removeElementById(id)` | Delete item and save tree. |
| `findElementById(id)` | Read one item from memory. |
| `findElementByModelId(modelId)` | Find navigation items linked to a source model record. |
| `findElementsByParentId(parentId, type)` | Read children by parent and optional type. |
| `saveToDB()` | Persist rebuilt tree JSON. |

Do not seed navigation by writing raw rows directly after startup. The catalog reads from memory, so programmatic changes should go through `NavigationStorage` and then `saveToDB()`.

## Item Types

### Model Link Item

`NavigationItem` extends `AbstractItem<NavItem>`. It represents a selected record from a configured source model.

Creation supports two flows:

- `_method: "select"`: choose an existing source record from the template dropdown;
- regular add flow: create a source model record through Adminizer's model form, then add it to navigation.

Stored fields include:

```ts
interface NavItem extends Item {
  urlPath?: string;
  modelId?: string | number;
  targetBlank?: boolean;
  visible?: boolean;
}
```

`urlPath` is generated by replacing `${data.record.<field>}` tokens from the source record:

```ts
private renderUrlPath(record: any): string {
  return this.urlPath.replace(/\$\{data\.record\.([^}]+)\}/g, (_match, field) =>
    encodeURIComponent(record?.[field] ?? "")
  );
}
```

### Group Item

`NavigationGroup` extends `AbstractGroup<NavItem>`. It stores a folder-like node with `name`, `targetBlank`, `visible`, and extra fields from `config.groupField`.

### Manual Link Item

`LinkItem` extends `NavigationGroup` but sets `isGroup = false`, `type = "link"`, and `icon = "insert_link"`. It uses a custom template that asks for a manual `link` value.

## Template Components

The module registers three catalog template component records:

```ts
ctx.catalogTemplateComponent({
  id: "model-link-template",
  catalog: "navigation",
  type: "navigation.model-link",
  component: catalogTemplates,
  exportName: "NavigationModelLinkTemplate",
});

ctx.catalogTemplateComponent({
  id: "group-template",
  catalog: "navigation",
  type: "navigation.group",
  component: catalogTemplates,
  exportName: "NavigationGroupTemplate",
});

ctx.catalogTemplateComponent({
  id: "link-template",
  catalog: "navigation",
  type: "navigation.link",
  component: catalogTemplates,
  exportName: "NavigationLinkTemplate",
});
```

The catalog item types return matching template types from `getAddTemplate()` and `getEditTemplate()`.

For example, model links return:

```ts
return {
  type: "navigation.model-link",
  data: {
    items,
    model: this.model,
    labels: { ... },
  },
};
```

`CatalogTree` receives registered template components from `catalogController.getCatalog`, imports the component asset, and passes `CatalogTemplateComponentProps` including `itemType`, `parentId`, `template`, and `actions`.

## Synchronizing Source Model Updates

`NavigationApp` listens to `model:updated`:

```ts
ctx.listener("model:updated", async (event) => {
  const itemConfig = this.config.items.find((item) =>
    item.model.toLowerCase() === event.modelName.toLowerCase()
  );
  if (!itemConfig) return;

  for (const section of this.config.sections) {
    navigationCatalog.setId(section);
    const navItem = navigationCatalog.itemTypes.find((item) =>
      item.type === event.modelName.toLowerCase()
    );
    if (navItem) {
      await navItem.updateModelItems(event.record.id, { record: event.record }, section);
    }
  }
});
```

This updates item names, URLs, and flags for navigation nodes linked to the edited source record.

## Consuming Navigation Data

Read the module storage model through app/project code. In the fixture, the model is named `Navigation` unless overridden.

```ts
const navigationModel = adminizer.modelHandler
  .createAppAccess("navigation")
  .get("Navigation");

const header = await navigationModel.findOne({ where: { label: "header" } });
const tree = header?.tree ?? [];
```

If you expose navigation to a public frontend, create a project route that reads the `tree` field and filters hidden nodes as needed.

Example response shape:

```json
[
  {
    "id": "h-group-docs",
    "name": "Docs",
    "type": "group",
    "parentId": null,
    "sortOrder": 0,
    "visible": true,
    "children": [
      {
        "id": "h-link-install",
        "name": "Install",
        "type": "link",
        "parentId": "h-group-docs",
        "sortOrder": 0,
        "urlPath": "/docs/install",
        "targetBlank": false,
        "visible": true,
        "children": []
      }
    ]
  }
]
```

## Programmatic Seeding

Seed after the module is enabled and the catalog storage is ready:

```ts
await adminizer.appManager.enable(new NavigationApp({
  ...navigationAppConfig,
  sync: true,
}));

const navCatalog = adminizer.catalogHandler.getCatalog("navigation") as any;
await navCatalog.ready?.();
await navCatalog.storageServices.ready();

const storage = navCatalog.storageServices.get("header");
const existing = await storage.findElementsByParentId(null, null);

if (existing.length === 0) {
  await storage.populateFromTree([
    {
      id: "h-group-docs",
      name: "Docs",
      type: "group",
      parentId: null,
      sortOrder: 0,
      icon: "folder",
      visible: true,
      children: [
        {
          id: "h-link-install",
          name: "Install",
          type: "link",
          parentId: "h-group-docs",
          sortOrder: 0,
          icon: "insert_link",
          urlPath: "/docs/install",
          targetBlank: false,
          visible: true,
          children: [],
        },
      ],
    },
  ]);
  await storage.saveToDB();
}
```

## Implementation Notes

- Instantiate `new NavigationApp(config)` after `adminizer.init()`.
- The fixture module registers the `Navigation` storage model at runtime through `ctx.model()`.
- Catalog form UI is connected through `ctx.catalogTemplateComponent()`.
- Keep Sequelize as the default recommendation. TypeORM remains experimental.
