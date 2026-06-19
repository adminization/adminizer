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

Adminizer will use `User`, `Group`, and the other canonical names internally, while validating and querying the mapped host ORM models. The same binding also works as a runtime alias, so app code with access to that model can resolve either the canonical name or the mapped host name.

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
