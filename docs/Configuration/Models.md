# Models

Models describe how each resource is presented in the admin panel. A model entry resides in the `models` section of the config and enables CRUD actions.

```js
module.exports.adminpanel = {
  models: {
    users: {
      title: 'Users',
      model: 'User',
      list: true,
      add: true,
      edit: true,
      view: true,
      remove: true
    }
  }
};
```

Available actions are `list`, `add`, `edit`, `view` and `remove`. Each action can be:

* `true`/`false` – enable or disable the action;
* an object with additional options (for example `limit` or `fields` for `list`).

A model can also define:

* `hide` – exclude it from the sidebar;
* `icon` – material icon name;
* `identifierField` – custom primary key;
* `titleField` – field used in relations or lists.
