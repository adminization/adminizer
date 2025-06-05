# Access Rights
When sails-adminpanel starts, for every Model it creates 4 access rights tokens:
- create
- read
- update
- delete

You can also create custom access rights tokens using function `registerToken` of `AccessRightsHelper`.

> Everything that is unresolved is prohibited

These tokens can be used to give users rights to see information of specific Model, to create new models or edit it.
Also, you can use tokens to create access rights to global and inline actions, or to Model tools.
In controllers you should check access rights through `havePermission` method.

Example:

```javascript
if (sails.config.adminpanel.auth) {
        if (!req.session.UserAP) { // check that user is authorized
            return res.redirect(`${sails.config.adminpanel.routePrefix}/model/userap/login`);
        } else if (!AccessRightsHelper.havePermission(`tokenName`, req.session.UserAP)) { // check permission
            return res.sendStatus(403);
        }
    }
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

```javascript
module.exports.adminpanel = {
    administrator: {
        login: 'string',
        password: 'string'
    }
}
```

## Groups and Inheritance

A user can belong to several groups. Their final permissions are the **union** of all tokens from these groups. Use this to create a hierarchy of roles. For example, `editor` can inherit the rights of `viewer` plus editing privileges:

```javascript
module.exports.adminpanel = {
    groups: {
        viewer: ['post-read'],
        editor: ['post-read', 'post-update'],
        admin: ['post-read', 'post-update', 'post-delete']
    }
};
```

When assigning users to groups, Adminizer automatically grants all associated tokens.

### Restricting Field Visibility

Tokens can be checked inside `groupsAccessRights` of a field. Only users who have the required token (either directly or through a group) will see the field:

```javascript
fields: {
    internalNotes: {
        type: 'text',
        groupsAccessRights: ['post-update']
    }
}
```

This way you can hide sensitive data from regular users while keeping it visible for editors or admins.
