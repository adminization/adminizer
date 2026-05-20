# Access Rights
When Adminizer starts, every configured model gets 4 access rights tokens:
- create
- read
- update
- delete

You can also create custom access rights tokens using function `registerToken` of `AccessRightsHelper`.

> Everything that is unresolved is prohibited

These tokens can be used to give users rights to see information of specific Model, to create new models or edit it.
Also, you can use tokens to create access rights to global and inline actions, or to Model tools.
In controllers you should check access rights through `hasPermission`.

Example:

```ts
if (req.adminizer.config.auth.enable) {
    if (!req.user) {
        return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }

    if (!req.adminizer.accessRightsHelper.hasPermission('tokenName', req.user)) {
        return res.sendStatus(403);
    }
}
```

### Registering Custom Tokens

Custom tokens let you restrict access to additional features beyond the standard CRUD actions. Register them when your application starts:

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
