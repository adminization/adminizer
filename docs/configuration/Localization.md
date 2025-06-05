# Локализация

Переводы интерфейса задаются блоком `translation`:

```js
module.exports.adminpanel = {
  translation: {
    locales: ['en', 'de'],
    path: 'config/locales',
    defaultLocale: 'en'
  }
};
```

- `locales` — список доступных локалей;
- `path` — относительный путь к файлам перевода;
- `defaultLocale` — локаль по умолчанию.
