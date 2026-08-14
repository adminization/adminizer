# Access Rights
When Adminizer starts, every configured model gets 4 access rights tokens:
- create
- read
- update
- delete

You can also create custom access rights tokens for app features.

> Everything that is unresolved is prohibited

These tokens can be used to give users rights to see information of a specific model, create or edit records, access global and inline actions, or use model tools.

For an Adminizer app, register the token and protect the controller through `AppSetupContext`:

```ts
ctx.accessRight({
  id: "reports-export",
  name: "Export reports",
  description: "Permission to export reports",
  department: "Reports",
});

ctx.controller({
  id: "export",
  method: "post",
  route: "/reports/export",
  middleware: async (req, res) => {
    // Use req.runtime for app capabilities.
    return res.json({ success: true });
  },
  policies: [
    { type: "auth", mode: "api" },
    { type: "permission", token: "reports-export", mode: "api" },
  ],
});
```

### Registering Custom Tokens

Custom tokens let you restrict access to additional features beyond the standard CRUD actions. Apps should register them through `ctx.accessRight()` so `AppManager` owns their lifecycle.

For host-level startup code outside an Adminizer app, tokens can still be registered directly:

```ts
adminizer.accessRightsHelper.registerTokens([
  {
    id: 'reports-export',
    name: 'Export reports',
    description: 'Permission to export data from Reports',
    department: 'reports'
  }
])
```

Assign the token to a group so members inherit the permission:

```ts
await adminizer.modelHandler
  .internal("access-rights")
  .get("Group")
  .update({ where: { name: 'managers' } }, { tokens: ['reports-export'] });
```

## Contextual Tokens

A contextual token assigns a group both a token and selected option IDs. The
token supplies the selectable options itself and can check access with those
trusted IDs.

### App modules: `ctx.accessRight()`

Register the token from `setup(ctx)`. The app owns the registration and it is
removed automatically when the app is disabled.

```ts
ctx.accessRight({
  id: "reports-export",
  name: "Export reports",
  description: "Permission to export reports for selected warehouses",
  department: "Reports",
  getOptions: async (user) => warehousesService.getOptions(user),
  check: async (user, context) => warehousesService.canAccess(
    user,
    context?.rights ?? [],
    context?.warehouseId,
  ),
});
```

`getOptions(user)` runs whenever the Groups UI loads the selector, so newly
created business entities are available without restarting Adminizer. Each
option has a stable `id`, a display `name`, and optional `description`.

An app controller invokes the single access-check API with its own context:

```ts
const allowed = await req.runtime.accessRights.hasPermission(
  "reports-export",
  req.user,
  {warehouseId: report.warehouseId},
);

if (!allowed) return res.status(403).send("Forbidden");
```

### Host application and legacy controllers: `accessRightsHelper`

Register a token once during application startup, after `adminizer.init()`.
Do not register it inside a request controller.

```ts
adminizer.accessRightsHelper.registerToken({
  id: "reports-export",
  name: "Export reports",
  description: "Permission to export reports for selected warehouses",
  department: "Reports",
  getOptions: async (user) => warehousesService.getOptions(user),
  check: async (user, context) => warehousesService.canAccess(
    user,
    context?.rights ?? [],
    context?.warehouseId,
  ),
});
```

In an existing host controller, `req.adminizer` remains available temporarily:

```ts
const allowed = await req.adminizer.accessRightsHelper.hasPermission(
  "reports-export",
  req.user,
  {warehouseId: report.warehouseId},
);
```

For list, export, update, or delete filtering, retrieve rights from groups and
apply them to the database query before pagination. `null` means unrestricted
access (administrator or disabled authentication), while an empty array means
no granted options.

```ts
const rights = req.adminizer.accessRightsHelper.getPermissionRights(
  "reports-export",
  req.user,
);

if (rights !== null) {
  query.where.warehouseId = rights;
}
```

The helper overwrites `context.rights` before calling `check`, so rights sent by
an HTTP client can never grant access. If `getOptions` or `check` throws, the
request is denied.

### Storage and Groups UI

Ordinary tokens remain strings:

```json
["reports-export"]
```

For a token with `getOptions`, enabling its checkbox reveals a multiple-choice
selector. Its selected IDs are stored as an object in `Group.tokens`:

```json
[
  "reports-export",
  {"tokenId":"warehouse-access","rights":["stock1","stock2"]}
]
```

Only ordinary legacy string tokens are supported alongside contextual grants.


## Users and Groups
In Model `Users` admin or someone who has access can create user profiles and give them specific access rights by adding them to `Groups`.
`Groups` represent lists of rights tokens, and you can choose which ones you want to add to this group.
After adding tokens to the groups you can add user to specific group and this user will have access rights that
you set to this group.

To do this, go to adminpanel app and in left navbar choose Users and Groups departments.

## Administrator

Add default administrator credentials in adminpanel config. If no admin profiles
will be found, adminpanel will create admin profile with this credentials.
If credentials in config will not be found, adminpanel will create admin with
login `admin` and numeric password that will be displayed in console.

```ts
const config = {
    administrator: {
        login: 'string',
        password: 'string'
    }
}
```
