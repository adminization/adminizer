# Using Adminizer UI components

Adminizer exposes its React UI components globally at runtime. To provide type safety in external projects, the components are compiled to declaration files during the build.

Running `npm run build` creates `*.d.ts` files under `dist/ui` which can be referenced via TypeScript path aliases.

Add the following mapping to your `tsconfig.json` in another project:

```json
{
  "compilerOptions": {
    "paths": {
      "@/components/ui/*": ["adminizer/dist/ui/components/ui/*"]
    }
  }
}
```

This allows you to import Adminizer components for typing while the actual implementation is loaded from the `UIComponents` global provided by the Vite externals plugin.
