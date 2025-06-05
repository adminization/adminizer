# Model Configuration

Each key inside the `models` section represents a model available in the admin panel. Every model definition consists of a reference to the ORM model and a set of actions that control how records are managed.

```javascript
module.exports.adminpanel = {
    models: {
        posts: {
            title: 'Blog Posts', // text in the sidebar
            model: 'Post',      // ORM model name
            identifierField: 'id',
            titleField: 'title',
            list: true,
            add: true,
            edit: true,
            view: true,
            remove: true
        }
    }
};
```

### Common Options

| Option | Purpose |
| ------ | ------- |
| `model` | **Required.** Name of the ORM model. |
| `title` | Display label in navigation. Defaults to the object key. |
| `identifierField` | Primary key field for links and relations. Default: `id`. |
| `titleField` | Field used in relations and breadcrumbs. |
| `tools` | Array of custom links shown above the record list. |
| `actions` | Define custom global or inline actions for the model. |
| `hidden` | When `true`, the model does not appear in the sidebar but can be accessed by direct URL. |

### Action Configuration

Actions can be enabled with a boolean (`true` or `false`) or configured via an object with additional options:

```javascript
models: {
    posts: {
        list: {
            limit: 20,
            fields: {
                id: true,
                title: true,
                createdAt: { displayModifier: val => new Date(val).toLocaleDateString() }
            }
        },
        add: true,
        edit: true
    }
}
```

The keys inside the `fields` block determine which fields appear in each action. You can use boolean shortcuts or provide a full field configuration object. For further details on field options see `Configuration/Fields.md`.
