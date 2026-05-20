# Localization

Adminizer supports interface translations using the `translation` block in the configuration.

```ts
const config = {
  translation: {
    locales: ['en', 'de'],
    directory: 'config/locales',
    defaultLocale: 'en'
  }
};
```

* `locales` – list of available locales
* `directory` – relative path to translation files
* `defaultLocale` – locale used when none is specified

`path` is still accepted for older configs, but is deprecated. Use `directory` for new projects.

In Inertia mode, interface strings are translated on the server through `req.i18n.__(...)` before props are sent to React components. This includes shared UI props such as sidebar navbar item titles and section labels.

## Shared UI keys

If you localize Adminizer UI through translation dictionaries, make sure the locale file includes shared keys used by common components:

* `Log out`
* `Adminpanel`
* `Visible`
* `First`, `Last`, `Previous`, `Next`

These keys are passed via shared `i18n.common` in Inertia mode and are used by menu/user controls and pagination UI.

For page-specific dictionaries, Adminizer uses `i18nPage` props, while reusable/common labels stay in `i18n.common`.

## Locale parity

Keep all locale files in `src/translations/` synchronized by key set.  
When new UI keys are added, update every locale file so non-default locales do not fall back to raw keys in the interface.

## Programmatic translations

You can append locale keys programmatically before the first requests are processed.

```ts
import { Adminizer } from "adminizer";

Adminizer.i18n.appendLocale("ru", {
  "My custom nav item": "Мой пункт меню"
});
```

If you already have an instance, the same API is available from it:

```ts
adminizer.i18n.appendLocale("ru", {
  "My custom nav item": "Мой пункт меню"
});
```

You can also import `I18n` directly:

```ts
import { I18n } from "adminizer";

I18n.appendLocale("ru", {
  "My custom nav item": "Мой пункт меню"
});
```
