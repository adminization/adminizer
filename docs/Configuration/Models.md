# System Models

Adminizer does not create or synchronize ORM models. The host application owns ORM initialization and must register all Adminizer system models before calling `adminizer.init()`.

Adminizer core uses canonical system model names without project-specific suffixes:

- `User`
- `Group`
- `Filter`
- `FilterColumn`
- `HistoryActions`
- `Notification`
- `UserNotification`

During startup Adminizer obtains these models from the adapter selected by `config.system.defaultORM` and validates their fields, primary keys, and required associations. Extra fields are allowed. Startup fails immediately when a model is missing or does not satisfy the system contract.

## Host Model Names

The ORM model name does not have to match the Adminizer canonical name. If a project already has host models named `UserAP`, `GroupAP`, or even custom names such as `Cats`, pass the mapping to the adapter:

```ts
const adapter = new SequelizeAdapter(sequelize, {
  systemModels: {
    User: "UserAP",
    Group: "GroupAP",
    Filter: "FilterAP",
    FilterColumn: "FilterColumnAP",
    HistoryActions: "HistoryActionsAP",
    Notification: "NotificationAP",
    UserNotification: "UserNotificationAP",
  },
});
```

Adminizer will use `User`, `Group`, and the other canonical names internally, while validating and querying the mapped host ORM models.

## Resource Names and Host Models

The key in `config.models` is the canonical **Adminizer resource name**. It controls the CRUD URL, model configuration, permission tokens, and `DataAccessor` behavior. The `model` property is only the physical ORM host model name.

This lets a project use host models whose names would otherwise conflict with Adminizer system resources:

```ts
const config = {
  models: {
    Customer: {
      model: "User", // project Waterline/ORM model
      title: "Customers",
    },
    CatalogGroup: {
      model: "Group", // project Waterline/ORM model
      title: "Catalog groups",
    },
    city: false, // registered for associations but hidden from the CRUD menu
  },
};
```

Together with the system binding above, the resulting mapping is:

| Adminizer resource | Host model | Example URL | Permission token |
| --- | --- | --- | --- |
| `User` | `UserAP` | `/model/User` | `read-user-model` |
| `Group` | `GroupAP` | `/model/Group` | `read-group-model` |
| `Customer` | `User` | `/model/Customer` | `read-customer-model` |
| `CatalogGroup` | `Group` | `/model/CatalogGroup` | `read-cataloggroup-model` |

Use the resource name in Adminizer code:

```ts
const systemUsers = adminizer.modelHandler.getResource("User");
const customers = adminizer.modelHandler.getResource("Customer");
```

Use `getByHostModel()` only when adapter metadata supplies a physical ORM model name, such as an association target:

```ts
const customerModel = adminizer.modelHandler.getByHostModel("User");
```

Resource names remain case-insensitive for compatibility, so do not register resource names that differ only by letter case.

### Multiple Adminizer Resources for One Host Model

You can expose the same host ORM model through multiple Adminizer resources when they need different fields, filters, URLs, or permissions. Mark exactly one resource as `primary: true`:

```ts
models: {
  Customer: {
    model: "User",
    primary: true,
    title: "Customers",
  },
  Customer2: {
    model: "User",
    title: "Customer audit view",
    fields: {
      email: {visible: false},
    },
  },
}
```

Both resources have independent CRUD URLs and permission tokens. The primary resource is used only when an association identifies its target by the host model name (`User` in this example). Startup fails if a shared host model has no primary resource or more than one primary resource.

### Deprecated Host-name Lookup

For existing integrations, a mapped system host name such as `UserAP` or `GroupAP` still resolves through `modelHandler.model.get()`. This is a deprecated compatibility alias:

```ts
// Deprecated: compatibility only.
adminizer.modelHandler.model.get("UserAP");

// Preferred canonical API.
adminizer.modelHandler.getResource("User");
```

Do not use host model names as aliases for project resources. In the example above, `modelHandler.model.get("User")` refers to the canonical system resource; use `getResource("Customer")` for the project model.

If your host ORM models already use canonical names, no mapping is required:

```ts
const adapter = new SequelizeAdapter(sequelize);
```

## Sequelize

Sequelize is the primary and recommended ORM. Register system models in the host Sequelize instance, define their associations, synchronize or migrate the database, and then construct Adminizer with the adapter:

```ts
registerSequelizeSystemModels(sequelize);
await sequelize.sync();

const adminizer = new Adminizer([
  new SequelizeAdapter(sequelize, {
    systemModels: {
      User: "UserAP",
      Group: "GroupAP",
      Filter: "FilterAP",
      FilterColumn: "FilterColumnAP",
      HistoryActions: "HistoryActionsAP",
      Notification: "NotificationAP",
      UserNotification: "UserNotificationAP",
    },
  }),
]);

await adminizer.init(config);
```

The fixture helper `registerSequelizeSystemModels` still registers host models with the `AP` suffix. That is fixture-specific naming, not a core requirement.

App-owned Sequelize models may be installed later, immediately before `appManager.enable(app)`.

## App-Owned Models

Models registered by apps are not part of the core system contract. `AppManager` only attaches an existing ORM model through `ctx.model()`; it does not define tables or synchronize schemas.

The fixture media manager is an example. Its `MediaManagerAP`, `MediaManagerMetaAP`, and `MediaManagerAssociationsAP` models are installed by `fixture/apps/media-manager/MediaManagerModels.ts` after `adminizer.init()` and before the media manager app is enabled. Adminizer does not require or create these models unless that app is used.

## TypeORM

TypeORM support is experimental. System entities must be included in `DataSource.entities` before initialization:

```ts
const dataSource = new DataSource({
  // ...
  entities: [
    ...typeOrmSystemModels,
    ...projectEntities,
  ],
});

await dataSource.initialize();

const adapter = new TypeOrmAdapter(dataSource, {
  systemModels: {
    User: "UserAP",
    Group: "GroupAP",
    Filter: "FilterAP",
    FilterColumn: "FilterColumnAP",
    HistoryActions: "HistoryActionsAP",
    Notification: "NotificationAP",
    UserNotification: "UserNotificationAP",
  },
});
```

App entities must also be included before `dataSource.initialize()`. Dynamic installation of app models into an initialized TypeORM `DataSource` is not supported. Apps without models continue to work, and apps with models work only when their entities were registered before initialization.
