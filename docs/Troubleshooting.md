### Issue with Model Name Casing in Config (Sequelize, TypeORM)

**Description:**

In different external resource modules (ORMs), model names can vary in casing — some use lowercase (`userresource`), while others use PascalCase (`UserResource`). This inconsistency causes configuration resolution issues and can result in the following error:

```
type error: model config of resourceprototype is undefined expected object
```

**Cause:**

Currently, models are referenced in the config using their name as-is — without normalization. For now, the `Models` object should have **lowercase** keys:

```ts
models: {
  userresource: { ...config },
  groupcatalog: { ...config }
}
```

The configuration system looks up the model config by exact key match. If the key casing doesn't match what the ORM adapter uses internally, the config is not found, and an error is thrown.

**Temporary Rule:**

* Use **lowercase model names** as keys in the `models` config section.
* Match the model name exactly as it is referenced internally by your ORM adapter (Sequelize or TypeORM).

**Planned Improvements:**

In the future, we will introduce the concept of a *model entity*, which will allow for more flexible and case-independent model resolution.

### ⚙️ Next.js Standalone Build Missing Adminizer Files

**Description:**

When using Adminizer with Next.js standalone build mode (`output: "standalone"`), the application may fail with errors like:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/node_modules/adminizer/controllers/addUser.js'
```

Or you may experience missing static assets (CSS, JS files, images) resulting in broken UI or 404 errors for files like:
- `/adminizer/assets/app-*.css`
- `/adminizer/assets/app-*.js`
- `/adminizer/fileicons/*.svg`

**Cause:**

Next.js standalone build analyzes your code to determine which files from `node_modules` are needed and only includes those in the final build output. However, Adminizer serves static files and uses dynamic imports at runtime, which Next.js cannot automatically detect during the build process. As a result, essential Adminizer files (controllers, assets, icons) are excluded from the standalone build.

**Solution:**

Since Adminizer **v4.4.0+**, the library includes automatic path fallback detection for Next.js standalone builds. You only need to configure Next.js to include Adminizer files in the build output.

Add the following to your `next.config.mjs`:

```js
/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/adminizer/**/*"
      ]
    },
  },
};

export default nextConfig;
```

**Explanation:**

- `outputFileTracingIncludes` tells Next.js which additional files to include in the standalone build
- `/api/**/*` applies this rule to all API routes (adjust the path if your Adminizer route is different)
- `./node_modules/adminizer/**/*` includes all Adminizer files (controllers, assets, translations, icons, etc.)

**Note:** With the `outputFileTracingIncludes` configuration, Next.js will automatically include Adminizer files in the `.next/standalone/node_modules/adminizer` directory, so no additional Docker COPY commands are needed.

### Build Fails Due to Missing `material-icons` CSS

**Description:**

Running `npm run build` may fail with an error like:

```
Can't resolve 'material-icons/iconfont/material-icons.css'
```

**Solution:**

Install the `material-icons` package so the CSS can be resolved:

```
npm install material-icons --legacy-peer-deps
```

### Naming Collision Between Attributes and Associations in Sequelize

**Description:**

Starting the application may fail with an error similar to:

```
Error: Naming collision between attribute 'parentNode' and association 'parentNode' on model MediaManagerAP
```

**Cause:**

Both an attribute and an association shared the alias `parentNode` in the `MediaManagerAP` model. Sequelize treats association aliases as properties on the model, so duplicate names are not allowed.

**Solution:**

Rename the association or attribute so that they use unique names. In version 4.2.1, the `parentNode` association has been renamed to `parent` across the related models.


