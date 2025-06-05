# Localization

Adminizer supports multiple languages for the interface texts. Localization is configured globally in the main settings object.

```javascript
await adminizer.init({
    translation: {
        locales: ['en', 'ru'],
        defaultLocale: 'en'
    }
});
```

### Adding Language Files

Translations are stored in JSON files under `locales/<lang>.json`. Create a new file for each locale you want to support:

```
locales/
├── en.json
├── ru.json
```

Each JSON file is a simple key‑value map. Keys correspond to labels used in Adminizer. Example `ru.json`:

```json
{
  "login": "Вход",
  "logout": "Выход",
  "dashboard": "Дашборд"
}
```

### Switching Locale

The interface language can be changed at runtime by calling `adminizer.setLocale('ru')`. You may expose this as a dropdown in your own layout or set it programmatically based on user preferences.
