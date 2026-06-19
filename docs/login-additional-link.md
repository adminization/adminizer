# Additional Login Page Link

Adds an optional link at the bottom of the login page, configured via `adminpanel.auth.addishinalLoginPage`.

## Configuration

In your Adminizer config, set the `auth.addishinalLoginPage` field. The link can be:

- Relative to `routePrefix` (recommended):
  - `'help'` becomes `<routePrefix>/help`
  - `'/model/help'` becomes `<routePrefix>/model/help`
- Absolute URL (left unchanged):
  - `'https://example.com/help'`

Optionally, you can specify an i18n key for the link text using `textKey`. If omitted, the default key `"Additional login page"` is used (translations added for all bundled locales).

Example:

```ts
// adminpanel config
auth: {
  enable: true,
  captcha: true,
  // Shown as a plain link at the bottom of the login card
  addishinalLoginPage: {
    link: '/model/User/register', // becomes <routePrefix>/model/User/register
    textKey: 'Additional login page' // optional; defaults to this value
  }
}
```

## Notes

- Only the link placement and rendering are provided. Implement the target controller/view yourself.
- Translations for the default key `"Additional login page"` were added to all built-in locales.
