# Feed Export API

Публичный API для экспорта данных фильтров в форматах JSON и XML (Atom). Позволяет внешним системам получать отфильтрованные данные по ссылке без авторизации.

## Обзор

Фильтры с включённым API-доступом генерируют уникальный `apiKey`, который можно использовать для получения данных в формате:
- **JSON** — для программной интеграции
- **XML (Atom)** — для RSS-подобных фидов (Яндекс.Маркет, новостные агрегаторы и т.д.)

## Как включить API для фильтра

1. Откройте список записей нужной модели
2. Нажмите кнопку **«Фильтры»** → выберите существующий фильтр для редактирования
3. Внизу диалога найдите секцию **«API-доступ (фид)»**
4. Включите переключатель
5. Нажмите **«Показать»** для просмотра ссылок
6. Скопируйте URL для JSON или XML

### Генерация ключа

- При первом включении API автоматически генерируется `apiKey` (UUID v4)
- Кнопка **«Перегенерировать»** создаёт новый ключ (старая ссылка перестаёт работать)
- Ключ хранится в базе данных в модели `FilterAP`

## Эндпоинты

### JSON экспорт

```
GET /adminizer/api/feed/{apiKey}.json
```

**Ответ:**
```json
{
  "feed": {
    "title": "Название фильтра",
    "description": "Описание фильтра",
    "modelName": "Example",
    "generatedAt": "2026-04-06T12:00:00.000Z",
    "totalItems": 42,
    "apiKey": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "id": 1,
        "name": "Запись 1",
        "status": "active",
        "createdAt": "2026-04-01T10:00:00.000Z"
      }
    ]
  }
}
```

### XML (Atom) экспорт

```
GET /adminizer/api/feed/{apiKey}.xml
```

**Ответ:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>/adminizer/api/feed/550e8400-e29b-41d4-a716-446655440000</id>
  <title>Название фильтра</title>
  <subtitle>Описание фильтра</subtitle>
  <updated>2026-04-06T12:00:00.000Z</updated>
  <link href="/adminizer/api/feed/550e8400-e29b-41d4-a716-446655440000.xml" rel="self" />
  <generator>Adminizer</generator>
  <entry>
    <id>1</id>
    <title>Запись 1</title>
    <updated>2026-04-01T10:00:00.000Z</updated>
    <summary>Запись 1</summary>
    <content type="html">
      <![CDATA[
      <table>
        <tr><th>id</th><td>1</td></tr>
        <tr><th>name</th><td>Запись 1</td></tr>
      </table>
      ]]>
    </content>
    <data>{"id":1,"name":"Запись 1"}</data>
  </entry>
</feed>
```

## Примеры использования

### curl

```bash
# JSON
curl https://example.com/adminizer/api/feed/YOUR_API_KEY.json

# XML
curl https://example.com/adminizer/api/feed/YOUR_API_KEY.xml
```

### JavaScript / Fetch

```javascript
const response = await fetch('/adminizer/api/feed/YOUR_API_KEY.json');
const data = await response.json();
console.log(data.feed.items);
```

### Python

```python
import requests

url = "https://example.com/adminizer/api/feed/YOUR_API_KEY.json"
response = requests.get(url)
data = response.json()

for item in data['feed']['items']:
    print(item['name'])
```

### RSS-агрегатор

Добавьте ссылку `https://example.com/adminizer/api/feed/YOUR_API_KEY.xml` в ваш RSS-ридер (Feedly, Inoreader и т.д.)

## Безопасность

- Для доступа нужны два ключа: `apiKey` фильтра и `userKey` пользователя (`UserAP.apiKey`)
- `apiKey` должен принадлежать приватному фильтру с включенным API-доступом
- `userKey` проверяется перед генерацией фида
- Глобальная авторизация должна быть включена (`auth.enable`)
- При компрометации ключа фильтра — перегенерируйте `apiKey` в UI фильтра
- При компрометации пользовательского ключа — перегенерируйте `userKey`

## Ошибки

| Код | Описание |
|-----|----------|
| `400` | Неверный формат. Поддерживаются только `json` и `xml` |
| `401` | Не передан `userKey` |
| `403` | Авторизация выключена или `userKey` неверный |
| `404` | Фильтр не найден или API-доступ отключён |
| `500` | Внутренняя ошибка сервера |

**Пример ошибки:**
```json
{
  "error": "Filter not found or API access is disabled",
  "message": "Check your apiKey or ensure API access is enabled for this filter"
}
```

## Архитектура

### Файлы

| Файл | Описание |
|------|----------|
| `src/services/FeedService.ts` | Сервис генерации фидов (JSON + XML) |
| `src/controllers/feed.ts` | HTTP-контроллер |
| `src/system/Router.ts` | Регистрация роутов |
| `src/controllers/filter-fields/savedFilters.ts` | Генерация apiKey при сохранении |
| `src/assets/js/components/list-table/filter-panel-save-dialog.tsx` | UI управления API |

### Формат данных

Данные форматируются так же, как в обычном экспорте (`exportData.ts`):
- Связи — по title field
- Даты — ISO 8601
- Булевы — "Yes"/"No"
- Массивы — через запятую
- JSON — сериализованная строка

Фильтры выполняются тем же путем, что и экспорт списка: условия фильтра преобразуются через `QueryBuilder` во внутренний `QueryCriteria`, а ORM-адаптер переводит criteria в свой формат запроса.

## Кастомизация

### Изменить структуру JSON

Отредактируйте метод `generateJsonFeed()` в `FeedService.ts`:

```typescript
async generateJsonFeed(filter: FilterAP): Promise<any> {
    const { records, fields, modelName } = await this.fetchFilterData(filter);
    // Ваша кастомная логика
    return { /* ваша структура */ };
}
```

### Изменить XML формат

Отредактируйте метод `buildAtomXml()` в `FeedService.ts`.
