# Custom Components

Adminizer can be extended with custom controls and dashboard widgets.

## Controls

Controls are reusable form inputs. Create a class extending `AbstractControls` and register it via `ControlsHandler`:

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

After registration the control can be referenced in field options:

```js
editor: {
  title: 'Editor',
  type: 'wysiwyg',
  options: { name: 'react-quill' }
}
```

## Widgets

Widgets are dashboard blocks. See [Widgets](Widgets.md) for a detailed example of creating and bundling custom widgets.
