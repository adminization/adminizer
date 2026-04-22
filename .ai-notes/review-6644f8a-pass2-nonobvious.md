# Code Review (ПРОХОД 2): неочевидные проблемы бекенда
**Дата:** 2026-04-22  
**Коммит:** 6644f8a  
**Область:** Бекенд, неочевидные проблемы пропущенные в первом проходе

---

## КРИТИЧЕСКИЕ (НАЙДЕНЫ ВО ВТОРОМ ПРОХОДЕ)

### [CRIT2-1] FeedService: эскалация прав через мутацию user
**Файл:** `src/services/FeedService.ts` ~строки 115-119

```typescript
const adminUser = user || this.getMinimalSystemUser();
if (!adminUser.isAdministrator) {
    adminUser.isAdministrator = true;  // MUTATION!
}
```

**Класс:** Privilege escalation + object mutation side-effect  
**Что происходит:**
1. Фид-сервис ПРИНУДИТЕЛЬНО поднимает юзера до администратора, чтобы обойти row-level фильтры DataAccessor'а
2. Мутирует переданный `user` объект — если он переиспользуется в том же request scope, последующий код увидит юзера как админа
3. Полностью обходит любые фильтры доступа в DataAccessor/accessRightsHelper

**Сценарий эксплуатации:**
- Фильтр на модель `Reports` с логикой `owner = currentUser.id`
- User C запрашивает feed по своему apiKey
- FeedService повышает его до admin → видит Reports всех пользователей
- Фильтр владельца не срабатывает т.к. админ обходит RLS

**Фикс:** не мутировать user, не поднимать до админа. Использовать нормальный DataAccessor с правами реального владельца фильтра (filter.userId), а не вызывающего.

---

### [CRIT2-2] IDOR в getFilterById — параметр user игнорируется
**Файл:** `src/lib/filters/FilterService.ts` ~строка 167

```typescript
async getFilterById(filterId: string, _user: UserAP): Promise<FilterAP | null> {
    const filter = await filterModel["_findOne"]({ id: filterId });
    return filter as FilterAP | null;
}
```

**Класс:** IDOR (CWE-639)  
Параметр назван `_user` (underscore = unused), и он действительно НЕ используется. Нет проверки `canViewFilter`. Вызовы из applyFilter/updateFilter/deleteFilter делают проверку снаружи, но метод сам по себе небезопасен и вызывается из FeedService/экспортов.

**Фикс:** либо переименовать в `getFilterByIdUnsafe` и документировать, либо внутри делать `canViewFilter` и возвращать null.

---

### [CRIT2-3] deleteFilter скрывает 404 за 200 — enumeration
**Файл:** `src/controllers/filter-fields/savedFilters.ts` ~строки 467-514

```typescript
if (error.message && error.message.includes('not found')) {
    return res.json({ success: true });
}
```

**Класс:** Information disclosure через enumeration  
DELETE любого UUID возвращает 200 независимо от того существует ли фильтр. Атакующий не может отличить "удалил чужой" от "не существует".

Но хуже обратное: если ownership-проверка бросает "access denied", а not-found — скрывается, то перебор UUID может привести к:
- 200 → либо успешно удалён свой, либо не существует
- 403 → **фильтр существует и принадлежит кому-то другому**

Это подтверждает существование чужих фильтров.

**Фикс:** возвращать 204/200 единообразно для "удалён или не существует"; 403 — только при явном ownership-нарушении и тогда возвращать тот же 204 (fail closed, но без дискриминации).

---

## СЕРЬЁЗНЫЕ (НЕОЧЕВИДНЫЕ)

### [ISSUE2-1] Public фильтры применяются без проверки модель-ACL
**Файл:** `src/lib/filters/FilterService.ts` — `getFiltersForModel` + `applyFilter`

Public-фильтр на модель `SecretData` может быть прочитан/применён пользователем, который не имеет прав на чтение самой модели `SecretData`. Проверяется ownership/visibility фильтра, но не проверяется что user имеет `read-SecretData-model`.

**Фикс:** перед `applyFilter` / при листинге public фильтров — проверять `accessRightsHelper.canRead(user, filter.modelName)`.

---

### [ISSUE2-2] FilterBuilder — static Map для hooks и registeredFilters
**Файл:** `src/lib/filters/FilterBuilder.ts` ~строки 81-85

```typescript
private static hooks: Map<FilterHookType, FilterHookCallback[]> = new Map();
private static registeredFilters: Map<string, FilterDefinition> = new Map();
```

**Класс:** Global state в multi-instance сценарии  
Если в процессе живут несколько инстансов Adminizer (multi-tenant, unit-tests параллельно, разные конфиги) — они делят одно состояние. Регистрация хука в одном тенанте повлияет на другой.

**Фикс:** перенести в instance поля или в `Adminizer`.

---

### [ISSUE2-3] inconsistent truthy checks на isAdministrator
Везде `if (user.isAdministrator)` — truthy check. Если в БД хранится строка `"false"` или число `0/1` — поведение непредсказуемое. Проверить типизацию поля в UserAP, и привести к строгому `=== true`.

**Фикс:** либо typed boolean на модели, либо везде `Boolean(user.isAdministrator) === true` / normalize.

---

### [ISSUE2-4] Нет транзакции при каскадном удалении filter + columns
**Файл:** `src/lib/filters/FilterService.ts` — `deleteFilter`

Сначала удаляются FilterColumnAP, потом FilterAP. Если второй запрос падает — остаётся фильтр без колонок (или наоборот orphan columns). Нет транзакции.

**Фикс:** обернуть в транзакцию адаптера Sequelize.

---

### [ISSUE2-5] TOCTOU при апдейте/удалении фильтра
Проверка ownership и сама операция — две отдельные транзакции. Между ними possible гонка: владелец может измениться или фильтр — быть удалён. В худшем случае — двойное удаление связанных записей.

**Фикс:** использовать SELECT ... FOR UPDATE или условный апдейт `UPDATE ... WHERE id=X AND userId=Y`.

---

### [ISSUE2-6] Sort direction не санитизируется
**Файл:** `src/lib/query-builder/ModernQueryBuilder.ts` ~строки 814-831

```typescript
return `${sortField} ${sortDirection}`;  // прямая конкатенация
```

`sortField` валидируется (whitelist), но `sortDirection` приходит из params — только default = DESC, но нет whitelist `['ASC','DESC']`. Если клиент пришлёт `sortDirection: "DESC; DROP TABLE x--"` — попадёт в ORDER BY.

**Фикс:** строгий whitelist `if (!['ASC','DESC'].includes(sortDirection.toUpperCase())) sortDirection = 'DESC'`.

---

### [ISSUE2-7] limit/page валидация отсутствует
Отрицательные/нулевые/NaN значения `limit`, `page` доходят до SQL. `LIMIT -1` в SQLite = без лимита, `offset = (page-1)*limit` при отрицательных даёт SQL error или утечку памяти.

**Фикс:** `limit = Math.min(Math.max(1, parseInt(limit)||10), MAX_LIMIT)`.

---

### [ISSUE2-8] Nested conditions — нет глобального лимита
**Файл:** `src/lib/filters/ConditionValidator.ts`

Есть `MAX_DEPTH=10` и `MAX_CONDITIONS_PER_GROUP=100`. Но глобального лимита на ВСЕ условия в фильтре нет. 100^10 = теоретический потолок. Даже 100*10*10 = 10 000 условий и ещё глубокое дерево — expensive при buildConditionGroup + транспорте в Sequelize.

**Фикс:** добавить `MAX_TOTAL_CONDITIONS = 500` с подсчётом при валидации.

---

### [ISSUE2-9] CSV injection в exportData
**Файл:** `src/controllers/exportData.ts` ~строки 351-364

`escapeCsvValue` экранирует только `,"\n\r`, но не префиксы `=`, `+`, `-`, `@`. Значения вида `=cmd|'/c calc'!A1` попадут в CSV и исполнятся в Excel/LibreOffice → RCE у получателя.

**Фикс:** префиксовать `'` для значений начинающихся с `=+-@\t\r`.

---

### [ISSUE2-10] Potential ReDoS в ConditionValidator
**Файл:** `src/lib/filters/ConditionValidator.ts` ~строка 555

```typescript
/\/\*.*\*\//s
```

`.*` жадный + DOTALL — на строках с `/*` без закрытия возможен экспоненциальный backtracking. 

**Фикс:** `\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/` или простой substring-check.

---

## ЗАМЕЧАНИЯ

### [NOTE2-1] Migration save — best-effort оставляет inconsistent state
FilterService сохраняет мигрированный фильтр "best effort". Если сохранение не удалось, клиент получает новую версию, но в БД остаётся старая. При следующем load миграция повторится. Не критично, но — технический долг.

### [NOTE2-2] Error messages раскрывают контекст
`"Filter 'X' not found"` с подстановкой ID — не критично, но лишний inf-leak.

### [NOTE2-3] FilterCondition — permissive union
Тип `FilterCondition` позволяет одновременно содержать `field`/`operator` И `rawSQL` И `children`. Билдер должен выбирать стратегию по presence полей — баги возможны.  
**Фикс:** discriminated union по `type: 'simple'|'group'|'raw'|'relation'`.

---

## ПРИОРИТЕТ ИСПРАВЛЕНИЯ

| # | Issue | Severity |
|---|-------|----------|
| CRIT2-1 | FeedService privilege escalation + user mutation | **БЛОКЕР** |
| CRIT2-2 | IDOR в getFilterById (unused _user) | **БЛОКЕР** |
| CRIT2-3 | deleteFilter 404→200 скрывает enumeration | **БЛОКЕР** |
| ISSUE2-1 | Public filters обходят model ACL | High |
| ISSUE2-6 | sortDirection без whitelist | High |
| ISSUE2-7 | limit/page без валидации | High |
| ISSUE2-9 | CSV injection | Medium-High (у получателя) |
| ISSUE2-4 | Нет транзакции на cascade delete | Medium |
| ISSUE2-5 | TOCTOU ownership | Medium |
| ISSUE2-2 | static Map в FilterBuilder | Medium (архитектурно) |
| ISSUE2-8 | нет глобального лимита условий | Medium |
| ISSUE2-10 | ReDoS в SQL-comment regex | Low-Medium |
| ISSUE2-3 | truthy check на isAdministrator | Low |

---

## СВОДКА ПО ДВУМ ПРОХОДАМ

**Всего критических блокеров:** 6  
- CRIT-1 (console.log с sensitive данными)  
- CRIT-2 (rawSQL доступен всем)  
- CRIT-3 (apiKey plain text)  
- **CRIT2-1 (FeedService privilege escalation)** ← самый опасный  
- CRIT2-2 (IDOR getFilterById)  
- CRIT2-3 (enumeration через delete 200)

**Рекомендация:** функционал фильтров и фидов требует существенной переработки перед мержом. Особенно FeedService — его текущая модель "поднимаем до админа и читаем всё" архитектурно неверна.
