# Поля моделей

Настройка полей может задаваться несколькими способами.

## Способы описания

- **Булево значение** — включить или скрыть поле
  ```js
  email: true,
  password: false,
  ```
- **Строка** — только название поля
  ```js
  name: "User Name",
  ```
- **Объект** — полный набор опций
  ```js
  bio: {
    title: 'Biography',
    type: 'text',
    required: true,
    tooltip: 'Shown on profile',
  }
  ```

Опции можно задавать глобально (`models.fields`) или в пределах действия (`list.fields`, `edit.fields` и т.д.). Настройки действия имеют приоритет.

## Поддерживаемые типы (`FieldsTypes`)

`string`, `password`, `date`, `datetime`, `time`, `integer`, `number`, `float`, `color`, `email`, `month`, `week`, `range`, `boolean`, `binary`, `text`, `longtext`, `mediumtext`, `ckeditor`, `wysiwyg`, `texteditor`, `word`, `tui`, `tuieditor`, `toast-ui`, `jsoneditor`, `json`, `array`, `object`, `ace`, `code`, `html`, `xml`, `aceeditor`, `image`, `images`, `file`, `files`, `table`, `geojson`, `mediamanager`, `geo-polygon`, `menu`, `navigation`, `schedule`, `worktime`, `association`, `association-many`, `select`, `select-many`.

При типе `text` и опции `editor` будет показан WYSIWYG редактор.
