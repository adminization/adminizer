# System Models

Adminizer ships with several built-in models used for authentication, media management, navigation, filters, notifications, and history. These definitions reside in `src/models`.

Sequelize is the primary supported ORM. Register system models with `SequelizeAdapter.registerSystemModels(sequelize)`.

TypeORM support is experimental. For the fixture, system entities are loaded with `TypeOrmAdapter.loadSystemEntities()` and passed to the TypeORM `DataSource`.

The provided models are:

- `UserAP`
- `GroupAP`
- `FilterAP`
- `FilterColumnAP`
- `HistoryActionsAP`
- `MediaManagerAP`
- `MediaManagerAssociationsAP`
- `MediaManagerMetaAP`
- `NavigationAP`
- `NotificationAP`
- `UserNotificationAP`

They can be created and queried like any other models once registered.

When using Sequelize the adapter generates explicit foreign keys using the
`<fieldName>Id` pattern. This prevents naming collisions between attributes and
associations when models reference themselves or each other.

