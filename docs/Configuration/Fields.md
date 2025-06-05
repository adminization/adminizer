# Field Options

Fields in a model can be configured in several ways.

### Notation

* **Boolean** – include or exclude the field
  ```js
  email: true,
  password: false,
  ```
* **String** – overrides the field title
  ```js
  name: "User Name",
  ```
* **Object** – full configuration
  ```js
  bio: {
    title: 'Biography',
    type: 'text',
    required: true,
    tooltip: 'Shown on profile',
  }
  ```

Field definitions can be placed globally under `models.fields` or inside an action (`list.fields`, `edit.fields`, etc.). Action level settings override the global ones.

### Types

Commonly used field types include `string`, `password`, `date`, `datetime`, `integer`, `boolean`, `text`, `select` and more. When a `text` field has the `editor` option, a WYSIWYG control will be used.
