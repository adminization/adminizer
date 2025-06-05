# Общие настройки

Админка настраивается с помощью объекта `AdminizerConfig`. Ниже приведён минимальный пример:

```ts
import { AdminizerConfig } from "adminizer";

const config: AdminizerConfig = {
  routePrefix: "/admin",
  auth: { enable: true },
  dashboard: true,
  models: {},
};
```

| Параметр | Описание |
|----------|---------|
| `routePrefix` | Базовый URL панели. По умолчанию `/admin`. |
| `linkAssets` | Создавать символьные ссылки на ресурсы вместо копирования. |
| `identifierField` | Поле, используемое как первичный ключ. |
| `showORMtime` | Отображать `createdAt` и `updatedAt` в формах. |
| `models` | Объект с описанием моделей. |
| `dashboard` | Включает виджеты на дашборде. |
| `showVersion` | Показывает версию Adminizer в сайдбаре. |

Дополнительно можно задать приветственный текст (`welcome`), параметры локализации и данные администратора.
