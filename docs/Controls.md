[Back](index.md)
# Controls
## Overview
AbstractControls is an abstract base class that defines the common interface for control components in the Adminizer system. It provides the foundational structure that all specific control types must implement.
## Type Definitions
### `ControlType`
```typescript
type ControlType = 'wysiwyg' | 'jsonEditor' | 'geoJson' | 'markdown' | 'table' | 'codeEditor'
```
Defines the available types of controls that can be implemented.
### `Path`
```typescript
interface Path {
    jsPath: {
        dev: string
        production: string
    },
    cssPath: string
}
```
Defines the path structure for JavaScript and CSS assets, with separate paths for development and production environments.
### `Config`
```typescript
type Config = Record<string, string | string[] | object | number | boolean>
```
Represents a configuration object that can contain various types of values.
## AbstractControls Class
### Properties
`name`

```typescript
public abstract readonly name: string
```
The unique name identifier for the control (abstract, must be implemented).

`type`
```typescript
public abstract readonly type: ControlType
```
The type of the control (abstract, must be implemented).

`path`
```typescript
public abstract readonly path: Path
```
The asset paths for the control (abstract, must be implemented).

`config`
```typescript
public abstract readonly config: Config
```
The configuration object for the control (abstract, must be implemented).

`routPrefix`
```typescript
public readonly routPrefix: string
```
The route prefix inherited from the Adminizer instance.
### Constructor
```typescript
protected constructor(adminizer: Adminizer)
```
Initializes the control with a reference to the Adminizer instance and sets the route prefix.

**Parameters:**
* `adminizer`: The Adminizer instance that owns this control
### Methods
`getConfig()`
```typescript
public abstract getConfig(): Config | undefined
```
Retrieves the control's configuration (abstract, must be implemented).

**Returns**: The configuration object or undefined
`getJsPath()`
```typescript
public abstract getJsPath(): string | undefined
```
Gets the appropriate JavaScript path based on environment (abstract, must be implemented).

**Returns**: The JavaScript path string or undefined
`getCssPath()`
```typescript
public abstract getCssPath(): string | undefined
```
Gets the CSS path (abstract, must be implemented).

**Returns**: The CSS path string or undefined
`getName()`
```typescript
public abstract getName(): string
```
Gets the control name (abstract, must be implemented).

**Returns**: The control name string
## Usage
To create a custom control, extend this abstract class and implement all abstract members:
```typescript
class MyCustomControl extends AbstractControls {
    public readonly name = "my-control";
    public readonly type: ControlType = 'wysiwyg';
    public readonly path = {
        jsPath: { dev: '/dev/path.js', production: '/prod/path.js' },
        cssPath: '/styles.css'
    };
    public readonly config = { /* ... */ };

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    // Implement all abstract methods...
}
```
# ControlsHandler
## Overview
The `ControlsHandler` class provides a centralized management system for control components in the Adminizer framework. It organizes controls by type and name, allowing for easy retrieval, addition, and removal of controls.
## Class Structure
### Properties
`controls`
```typescript
private controls = new Map<ControlType, Map<string, AbstractControls>>()
```
Internal storage structure that maintains controls in a nested Map:
* Outer Map: Key is `ControlType`
* Inner Map: Key is control name, value is the `AbstractControls` instance
### Methods
`add(control: AbstractControls): void`

Adds a new control to the handler.

**Parameters:**
* `control`: The control instance to add (must extend `AbstractControls`)
* 
**Behavior**:

* Creates a new type group if the control type doesn't exist
* Throws an error if a control with the same name already exists
* Adds the control to the appropriate type group

**Example:**
```typescript
handler.add(new MyControl(adminizer));
```
`get<T extends ControlType>(type: T, name: string): AbstractControls | undefined`

Retrieves a specific control by its type and name.

**Parameters:**

* `type`: The type of control to retrieve
* `name`: The name of the specific control

**Returns**: The control instance or undefined if not found

**Example:**
```typescript
const editor = handler.get('wysiwyg', 'main-editor');
```
`getByType<T extends ControlType>(type: T): AbstractControls[]`

Retrieves all controls of a specific type.

**Parameters:**
* `type`: The type of controls to retrieve

**Returns:** An array of control instances (empty array if none found)

**Example:**
```typescript
const allEditors = handler.getByType('wysiwyg');
```
`remove(type: ControlType, name: string): boolean`

Removes a control from the handler.

**Parameters:**
* `type`: The type of control to remove
* `name`: The name of the specific control

**Returns:** `true` if the control was found and removed, `false` otherwise

**Example:**
```typescript
const wasRemoved = handler.remove('wysiwyg', 'old-editor');
```
`getAll(): Record<ControlType, AbstractControls[]>`

Retrieves all controls grouped by type.

**Returns:** An object where keys are control types and values are arrays of controls

**Example:**
```typescript
const allControls = handler.getAll();
// Returns: { wysiwyg: [...], markdown: [...], ... }
```
`collectAndGenerateStyleLinks(): string[]`
Collects all CSS paths from registered controls.

Returns: An array of CSS paths

**Example:**
```typescript
const stylesheets = handler.collectAndGenerateStyleLinks();
```
### Usage Example
```typescript
// Initialize handler
const handler = new ControlsHandler();

// Add controls
handler.add(new WysiwygControl(adminizer));
handler.add(new MarkdownControl(adminizer));

// Get controls
const mainEditor = handler.get('wysiwyg', 'main-editor');
const allMarkdown = handler.getByType('markdown');

// Get all stylesheets
const styles = handler.collectAndGenerateStyleLinks();
```
## Redefining basic controls
Create a new `class`, for example:
```typescript
export class ReactQuill extends AbstractControls {
    readonly name: string = 'react-quill';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/modules/react-quill-editor.css`,
        jsPath:
            {
                dev: "/modules/controls/wysiwyg/react-quill-editor.tsx",
                production: `${this.routPrefix}/assets/modules/react-quill-editor.es.js`
            }
    }
    readonly config: Config = {};

    getConfig(): Config {
        return this.config;
    }

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getJsPath(): string {
        if (process.env.ADMINIZER_ENV === 'dev') {
            return this.path.jsPath.dev;
        } else {
            return this.path.jsPath.production
        }
    }

    getCssPath(): string {
        return this.path.cssPath
    }

    getName(): string {
        return this.name
    }
}

```
Then add it via `ControlsHandler`, like this:
```typescript
// add custom control wysiwyg
adminizer.emitter.on('adminizer:loaded', () => {
    adminizer.controlsHandler.add(new ReactQuill(adminizer))
})
```
After that, you can use in the configuration:
```js
 editor: {
    title: 'Editor',
    type: 'wysiwyg',
    options: {
        name: 'react-quill',
    }
}
```
See the implementation example here `fixture` & here `modules/controls/wysiwyg`

To build the module, you will need custom `vite.config`
```typescript
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {viteExternalsPlugin} from "vite-plugin-externals";

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: 'React',
            'react-dom': 'ReactDOM',
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ''),
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, 'react-quill-editor.tsx'),
            name: 'ComponentB',
            formats: ['es'],
            fileName: (format) => `react-quill-editor.${format}.js`,
        },
        rollupOptions: {
            output: {
                assetFileNames: ({ names }) => {
                    if (names && names[0].endsWith('.css')) {
                        return 'react-quill-editor.css';
                    }
                    return '[name]-[hash][extname]';
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../../src/assets/js'),
        },
    },
});
```
