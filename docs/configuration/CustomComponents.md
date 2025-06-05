# Пользовательские компоненты

Adminizer можно расширять собственными контролами и виджетами.

## Контролы

Контролы — это переиспользуемые поля форм. Создайте класс, наследующий `AbstractControls`, и зарегистрируйте его через `ControlsHandler`:

```ts
class ReactQuill extends AbstractControls {
  readonly name = 'react-quill';
  readonly type = 'wysiwyg';
  readonly path = {
    jsPath: { dev: '/modules/react-quill.tsx', production: '/assets/react-quill.es.js' },
    cssPath: '/assets/react-quill.css'
  };
}

adminizer.emitter.on('adminizer:loaded', () => {
  adminizer.controlsHandler.add(new ReactQuill(adminizer));
});
```

После регистрации контрол можно указать в настройках поля:

```js
editor: {
  title: 'Editor',
  type: 'wysiwyg',
  options: { name: 'react-quill' }
}
```

## Виджеты

Виджеты отображаются на дашборде. Подробный пример их создания смотрите в файле [Widgets.md](Widgets.md).
