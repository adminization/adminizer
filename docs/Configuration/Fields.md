# Field Options

Each field in a model is configured with an object (`ModelFieldConfig`):

```js
bio: {
  title: 'Biography',
  type: 'text',
  required: true,
  tooltip: 'Shown on profile',
}
```

To hide a field, set `visible: false` instead of omitting it. To override only the title, pass `{ title: 'User Name' }`.

> **Breaking change in v5:** the boolean (`field: true`/`false`) and string (`field: 'Title'`) shorthand notations were removed. Use the object form. A primitive value will be ignored at runtime with a warning.

Field definitions can be placed globally under `models.fields` or inside an action (`list.fields`, `edit.fields`, etc.). Action level settings override the global ones; objects are merged shallowly.

### Types

Commonly used field types include `string`, `password`, `date`, `datetime`, `integer`, `boolean`, `text`, `select` and more. When a `text` field has the `editor` option, a WYSIWYG control will be used.
