# Localization

Adminizer supports interface translations using the `translation` block in the configuration.

```js
module.exports.adminpanel = {
  translation: {
    locales: ['en', 'de'],
    path: 'config/locales',
    defaultLocale: 'en'
  }
};
```

* `locales` – list of available locales
* `path` – relative path to translation files
* `defaultLocale` – locale used when none is specified
