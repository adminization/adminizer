# Custom Components

Adminizer can be extended with custom controls and dashboard widgets.

## Controls

Controls are reusable form inputs loaded only when their field is rendered. Custom controls are registered as app-owned resources through `ctx.control()`:

```ts
setup(ctx: AppSetupContext): void {
  ctx.control({
    type: "wysiwyg",
    name: "react-quill",
    component: {
      id: "editor",
      filePath: path.resolve(import.meta.dirname, "react-quill-editor.es.js"),
      devUrl: "/apps/react-quill/react-quill-editor.tsx",
    },
    stylesheet: {
      id: "editor-css",
      filePath: path.resolve(import.meta.dirname, "react-quill-editor.css"),
      devUrl: "/apps/react-quill/react-quill-editor.css",
    },
  });
}
```

After registration the control can be referenced in field options:

```js
editor: {
  title: 'Editor',
  type: 'wysiwyg',
  options: { name: 'react-quill' }
}
```

Enable the owning app after `adminizer.init()`. See [Controls](../Controls.md) for the complete app, Vite build, lazy-loading, and fallback behavior.

## Widgets

Widgets are dashboard blocks. See [Widgets](Widgets.md) for a detailed example of creating and bundling custom widgets.
