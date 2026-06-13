# Media Manager

The media manager has two layers in Adminizer v5:

- Core owns the legacy HTTP transport, upload adapter, thumbnail endpoint, public-file binding, and file icons.
- An app owns the storage models and the `AbstractMediaManager` implementation.

Adminizer no longer creates media manager ORM models. The fixture implementation in `fixture/apps/media-manager` is the Sequelize reference.

## App Registration

A media manager app declares its access right, existing models, scoped model access, and manager factory:

```ts
setup(ctx: AppSetupContext): void {
  ctx.accessRight({
    id: "mediaManager-default",
    name: "default",
    description: "Access to edit the default media manager",
    department: "media-manager",
  });

  ctx.model({ name: "MediaManagerAP", adapter: "sequelize" });
  ctx.model({ name: "MediaManagerMetaAP", adapter: "sequelize" });
  ctx.model({ name: "MediaManagerAssociationsAP", adapter: "sequelize" });

  ctx.modelAccess({
    models: [
      "MediaManagerAP",
      "MediaManagerMetaAP",
      "MediaManagerAssociationsAP",
    ],
  });

  ctx.mediaManager({
    factory: (runtime) => new ProjectMediaManager(runtime, config),
  });
}
```

`AppManager` creates the manager after model bindings and model access are ready. Disabling the app unregisters the manager, but it does not remove native ORM models or database tables.

## Sequelize Setup

Sequelize app models can be installed after Adminizer startup and immediately before the app is enabled:

```ts
await adminizer.init(adminpanelConfig);

await installMediaManagerSequelizeModels(sequelize, true);
await adminizer.appManager.enable(
  new MediaManagerApp(adminpanelConfig.mediamanager!)
);
```

The installer and app above are fixture reference code, not automatically registered package models. A host project should provide an equivalent installer, migrations, and app implementation.

The fixture models are:

- `MediaManagerAP`
- `MediaManagerMetaAP`
- `MediaManagerAssociationsAP`

They are app-owned and are not part of the required system model contract described in [System Models](Configuration/Models.md).

## TypeORM

TypeORM support remains experimental. The core system models can be used with TypeORM, but app entities cannot be added dynamically after `DataSource.initialize()`.

To implement a TypeORM media manager app:

1. Define the media manager entities in the host project.
2. Add them to `DataSource.entities` before `initialize()`.
3. Initialize the data source and Adminizer.
4. Enable the app that attaches those existing entities.

The fixture does not currently enable its media manager app for TypeORM. Core logs a warning when an app is enabled while `system.defaultORM` is `typeorm`.

## Core Transport In Version 5

The following compatibility endpoints and resources remain in core:

- `${routePrefix}/media-manager-uploader/:id`
- `${routePrefix}/media-manager-uploader/:id/upload`
- `${routePrefix}/media-manager-uploader/:id/upload-variant`
- `${routePrefix}/get-thumbs`
- `${routePrefix}/fileicons`
- `/public` when `bind.public` is enabled and `mediamanager.fileStoragePath` is configured

The controllers currently resolve managers through `req.adminizer.mediaManagerHandler`. Moving this transport to the system runtime is deferred to v6.

`npm run copy:backend` copies `src/fileicons` to `dist/fileicons`, so production startup from `dist` uses the built resource path.

## Legacy Registration

Custom media managers that are not apps remain supported during v5:

```ts
class CustomMediaManager extends AbstractMediaManager {
  constructor(adminizer: Adminizer) {
    super(adminizer);
  }

  // Implement the abstract media manager methods.
}

const manager = new CustomMediaManager(adminizer);
adminizer.mediaManagerHandler.add(manager);
```

The `AbstractMediaManager` constructor calls the legacy `_bindAccessRight()` path. Both the constructor dependency and direct `mediaManagerHandler.add()` registration are deprecated and planned for removal in v6.

An app-owned manager should register its token with `ctx.accessRight()`. Until the base constructor changes in v6, it can pass a no-op legacy host to `super(...)`; `fixture/apps/media-manager/DefaultMediaManager.ts` shows this compatibility pattern.

## Configuration

Core transport still reads `AdminpanelConfig.mediamanager`:

```ts
mediamanager: {
  fileStoragePath: ".tmp/public",
  allowMIME: ["image/*", "application/*", "text/*", "video/*"],
  maxByteSize: 2 * 1024 * 1024,
  imageSizes: {
    sm: { width: 350, height: 350 },
    lg: { width: 750, height: 750 },
  },
},
bind: {
  public: true,
},
```

Fields using the media manager select a registered manager by id:

```ts
media: {
  type: "mediamanager",
  options: {
    id: "default",
    group: "images",
    accept: ["image/jpeg", "image/png"],
  },
},
```
