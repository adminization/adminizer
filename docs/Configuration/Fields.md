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

Commonly used field types include `string`, `password`, `date`, `datetime`, `integer`, `boolean`, `text`, `select`, `wysiwyg`, `markdown`, `table`, `jsonEditor`, `codeEditor`, and `geoJson`.

Control fields can select a registered implementation by name:

```ts
editor: {
  title: "Editor",
  type: "wysiwyg",
  options: {
    name: "react-quill",
    config: {},
  },
}
```

Control JavaScript and CSS are loaded when the field is rendered. If the named control is unavailable, Adminizer logs a server warning and uses the built-in default for that control type. See [Controls](../Controls.md).
