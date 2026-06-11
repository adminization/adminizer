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
  .get("GroupAP")
  .update({ where: { name: 'managers' } }, { tokens: ['reports-export'] });
```


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
