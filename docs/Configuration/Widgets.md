This is an example of customizing a custom widget (CustomOne) in a React application that is built using Vite.

### **1. Custom Widget Definition (`fixture/widgets/Custom.ts`)**
- This is a widget class (`CustomOne`) that extends a base widget class (`CustomBase`).
- It defines metadata for the widget, such as:
    - `id`, `name`, `description`, and `department` (e.g., `"test"`)
    - `icon` (using a Lucide icon name, `"activity"`)
    - Default `size` (height and width in grid units)
    - `backgroundCSS` (a light gray color)
- It specifies JavaScript paths for **development** (direct `.tsx` file) and **production** (a compiled `.es.js` file).
- The widget is initialized with a `routePrefix` (likely a base URL for asset loading).

### **2. React Component**
- This is the actual UI implementation of the widget.
- It displays:
    - A **message** (passed as a prop)
    - A **button** that increments a counter when clicked
    - The **current counter value** (managed via React’s `useState`)
- The button uses basic styling (similar to a styled button component).

### **3. Vite Build Configuration**
- Configures the build process for the React component.
- **Key settings:**
    - Builds the component as an **ES module** (`lib` mode).
    - Outputs the file as `CustomWidget.es.js`.
    - Treats `react` and `react-dom` as **external dependencies** (they won’t be bundled; expected to be loaded separately).
    - Uses path aliases (e.g., `@` points to a shared JS directory).
    - Supports both **development** (direct `.tsx` usage) and **production** (optimized `.es.js` file).

### **How It All Works Together**
1. **`CustomOne`** defines the widget’s metadata and where its JavaScript lives.
2. **`CustomWidget`** provides the interactive UI (a counter button with a message).
3. **Vite** compiles the React component into a standalone ES module (`CustomWidget.es.js`).
    - In **development**, it loads the `.tsx` file directly.
    - In **production**, it should load the optimized `.es.js` file from a registered asset URL. Prefer `AssetHandler`/app asset routes for new code instead of manually copied static asset paths.

This setup allows the widget to be reusable, dynamically loaded, and integrated into a larger application.
