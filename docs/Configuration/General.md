# General Settings

This section describes the base options of `adminpanel.config` that control the behaviour of Adminizer as a whole. Each option can be provided when calling `adminizer.init()`.

```javascript
await adminizer.init({
    routePrefix: '/admin',
    auth: true,
    dashboard: true,
    showVersion: true,
    linkAssets: true,
    translation: {
        locales: ['en', 'ru'],
        defaultLocale: 'en'
    },
    administrator: {
        login: 'admin',
        password: 'admin123'
    },
    welcome: {
        title: 'Welcome',
        text: 'Use the navigation to manage your models.'
    }
});
```

### Available Options

| Option | Description |
| ------ | ----------- |
| `routePrefix` | URL prefix for all Adminizer routes. Defaults to `/admin`. |
| `auth` | Enables built‑in authentication. If `false`, the panel is accessible without login. |
| `dashboard` | `true` or an object. Enables the dashboard with widgets. Use `false` to disable completely. |
| `welcome` | Message shown on the home page when the dashboard is disabled. |
| `linkAssets` | Creates a symlink to panel assets. Useful when deploying in production. |
| `translation` | Defines available locales and the default language of the UI. |
| `administrator` | Credentials for the automatically created administrator profile. |
| `showVersion` | Displays the current Adminizer version in the footer. |
| `showORMtime` | If `true`, `createdAt` and `updatedAt` fields appear in the edit and add forms. |

These options provide the foundation for a working admin panel and can be combined with model‑level configuration described in the next section.
