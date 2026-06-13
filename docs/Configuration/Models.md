# System Models

Adminizer does not create or synchronize ORM models. The host application owns ORM initialization and must register all Adminizer system models before calling `adminizer.init()`.

The required system models are:

- `UserAP`
- `GroupAP`
- `FilterAP`
- `FilterColumnAP`
- `HistoryActionsAP`
- `NotificationAP`
- `UserNotificationAP`

During startup Adminizer obtains these models from `config.system.defaultORM` and validates their fields, primary keys, and required associations. Extra fields are allowed. Startup fails immediately when a model is missing or does not satisfy the system contract.

The fixture implementations are the current reference:

- `fixture/models/sequelize/systemModels.ts`
- `fixture/models/typeorm/systemModels.ts`

## Sequelize

Sequelize is the primary and recommended ORM. Register system models in the host Sequelize instance, define their associations, synchronize or migrate the database, and then construct Adminizer:

```ts
registerSequelizeSystemModels(sequelize);
await sequelize.sync();

const adminizer = new Adminizer([
  new SequelizeAdapter(sequelize),
]);

await adminizer.init(config);
```

App-owned Sequelize models may be installed later, immediately before `appManager.enable(app)`.

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
```

App entities must also be included before `dataSource.initialize()`. Dynamic installation of app models into an initialized TypeORM `DataSource` is not supported. Apps without models continue to work, and apps with models work only when their entities were registered before initialization.
