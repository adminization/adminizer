# Code Review: коммит 6644f8a — фильтры и фиды (бекенд)
**Дата:** 2026-04-22  
**Ревьювер:** AI maintainer agent  
**Область:** Только бекенд  
**Коммит:** 6644f8a00a237bf6086617eba083bc11b894d067 ("added filters")

---

## Масштаб изменений

99 файлов, ~18 700 строк добавлено, ~3 300 удалено.  
Ключевые новые подсистемы:
- `src/lib/filters/` — FilterService, FilterBuilder, ConditionValidator, FilterMigrator, FilterCustomFieldHandler
- `src/lib/query-builder/ModernQueryBuilder.ts` — замена NodeTable
- `src/controllers/filter-fields/` — CRUD фильтров
- `src/services/FeedService.ts` — экспорт фидов через API key
- `src/controllers/exportData.ts` — экспорт данных
- `src/controllers/inlineUpdate.ts` — инлайн редактирование
- `src/models/FilterAP.ts`, `FilterColumnAP.ts` — новые модели

---

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ (блокеры для мержа)

### [CRIT-1] console.log с sensitive данными в production
**Файлы:**
- `src/lib/filters/FilterService.ts` ~строки 437-463
- `src/services/FeedService.ts` ~строки 88-106

Методы deleteFilter и fetchFilterData содержат console.log с userId, filterId и stack trace.  
**Проблема:** утечка внутренних данных в логах production.  
**Fix:** заменить на `Adminizer.log.debug()` или удалить.

---

### [CRIT-2] rawSQL в FilterBuilder без ограничения по роли
**Файл:** `src/lib/filters/FilterBuilder.ts` — метод `whereRaw()`  
**Файл:** `src/lib/query-builder/ModernQueryBuilder.ts`

Любой аутентифицированный пользователь может создать фильтр с raw SQL. ConditionValidator содержит regex-защиту, но она недостаточна — SQL-комментарии и нестандартные пробелы могут её обойти.  
**Проблема:** потенциальный SQL injection через пользовательские фильтры.  
**Fix:** проверять `user.isAdministrator` перед сохранением `rawSQL` условия. Для non-admin — возвращать 403.

---

### [CRIT-3] API ключи хранятся в БД plain text
**Файл:** `src/helpers/apiKeyHelper.ts`  
**Файл:** `src/models/UserAP.ts` — поле `userApiKey: { type: "string" }`

`generateUserApiKey()` возвращает `randomUUID()`, который сразу сохраняется в БД без хеширования.  
**Проблема:** компрометация БД = все API ключи раскрыты.  
**Fix:** хранить bcrypt/argon2 хеш. Сравнивать `hash(incoming) === storedHash`.

---

## СЕРЬЁЗНЫЕ ПРОБЛЕМЫ (нужно исправить до мержа)

### [ISSUE-1] Дублирование convertDatetimeConditions (x4)
**Файлы:**
- `src/lib/filters/FilterService.ts` ~строки 726-798
- `src/controllers/list.ts` ~строки 18-106
- `src/controllers/exportData.ts` ~строки 14-91
- `src/services/FeedService.ts` — своя версия

Одна и та же логика написана минимум 4 раза. Баг нужно будет фиксить в 4 местах.  
**Fix:** вынести в `src/helpers/filterDatetimeHelper.ts`.

---

### [ISSUE-2] Implicit ownership check — не в контроллере
**Файл:** `src/controllers/filter-fields/savedFilters.ts` ~строки 394-414

При обновлении чужого фильтра проверка `canEditFilter()` происходит внутри `FilterService.updateFilter()`, а не явно в контроллере. Это скрытая бизнес-логика.  
**Fix:** добавить явную проверку в контроллере перед вызовом updateFilter.

---

### [ISSUE-3] Нетипизированные условия в session.d.ts
**Файл:** `src/types/session.d.ts`

```typescript
temporaryFilters?: Record<string, {
    conditions: any[];   // должно быть FilterCondition[]
    columns?: any[] | null;  // null vs undefined непоследовательно
}>;
```
**Fix:** использовать `FilterCondition[]` и `FilterColumnAP[] | undefined`.

---

### [ISSUE-4] `as any` касты в FilterService — потеря type safety
**Файл:** `src/lib/filters/FilterService.ts` — минимум 4 каста `as any`

Все они обходят отсутствующие поля `filters` и `modelFilters` в `AdminpanelConfig`.  
**Fix:** расширить интерфейс `AdminpanelConfig` в `src/interfaces/adminpanelConfig.ts`.

---

### [ISSUE-5] Export без лимита записей
**Файл:** `src/controllers/exportData.ts`

Нет ограничения MAX_EXPORT_RECORDS. Пустой фильтр = выгрузка всей таблицы.  
**Риск:** DoS через большой экспорт + утечка данных.  
**Fix:** добавить константу `MAX_EXPORT_RECORDS = 10000`, возвращать предупреждение при приближении к лимиту.

---

### [ISSUE-6] Feed endpoint без Rate Limiting
**Файл:** `src/controllers/feed.ts`

Публичный endpoint по apiKey без ограничения запросов.  
**Fix:** добавить rate limiting по IP/apiKey (например, express-rate-limit).

---

## ЗАМЕЧАНИЯ (tech debt)

### [NOTE-1] FilterMigrator — потенциально dead code
**Файл:** `src/lib/filters/FilterMigrator.ts`

`CURRENT_FILTER_VERSION = 1`, список миграций пуст `{}`, deprecated operators mapping пуст. Класс существует, но ни одна миграция никогда не выполнится.  
**Статус:** over-engineering для несуществующего будущего.  
**Рекомендация:** удалить сейчас. Добавить обратно когда появится реальная V2.

---

### [NOTE-2] FilterBuilder.registerFilter() — нигде не вызывается
**Файл:** `src/lib/filters/FilterBuilder.ts` ~строки 530-545

Метод статической регистрации фильтров из конфига написан, но не используется ни в Adminizer.ts, ни в конфигах.  
**Рекомендация:** удалить до появления реального использования.

---

### [NOTE-3] NodeTable.ts удалён — проверить полную замену
**Файл удалён:** `src/lib/datatable/NodeTable.ts`  
**Замена:** `src/lib/query-builder/ModernQueryBuilder.ts`

Нужно убедиться, что нет других мест где NodeTable был импортирован/использован.

---

### [NOTE-4] console.error в feed раскрывает stack trace
**Файл:** `src/controllers/feed.ts` ~строки 75-79

```typescript
console.error('Stack:', error?.stack);
```
Stack trace в production логах может раскрыть структуру БД при ошибке.  
**Fix:** Adminizer.log.error() с контролируемым уровнем деталей.

---

## ПОЛОЖИТЕЛЬНЫЕ МОМЕНТЫ

- Архитектура фильтров хорошо разделена (Service / Builder / Validator)
- ConditionValidator имеет реальные защитные лимиты (MAX_DEPTH=10, MAX_CONDITIONS_PER_GROUP=100, MAX_STRING_LENGTH=10000)
- Контроль доступа к фильтрам реализован (canViewFilter / canEditFilter / canDeleteFilter)
- Fluent API в FilterBuilder удобен для программного использования
- Поддержка временных фильтров через сессию — хорошая UX идея
- Double auth на feed (apiKey + userKey) — правильное решение
- ModernQueryBuilder — хорошая замена NodeTable с поддержкой вложенных условий

---

## ИТОГ

| Категория | Статус |
|-----------|--------|
| Безопасность | ⛔ 3 критических проблемы |
| Архитектура | ✅ Логичная, разделённая |
| Качество кода | ⚠️ Дублирование, as any, console.log |
| Типизация | ⚠️ Есть дыры |
| Dead code | ⚠️ FilterMigrator, registerFilter() |

**Вердикт: НЕ ГОТОВ К МЕРЖУ**  
Минимально необходимо до мержа: CRIT-1, CRIT-2, CRIT-3, ISSUE-1, ISSUE-5.

---

*Следующий шаг: детальный разбор фронтенда (filter-panel.tsx ~2683 строки)*
