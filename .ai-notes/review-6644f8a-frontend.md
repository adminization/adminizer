# Code Review: коммит 6644f8a — фронтенд
**Дата:** 2026-04-22  
**Коммит:** 6644f8a ("added filters")  
**Область:** Только фронтенд (React/Inertia/TypeScript)

---

## Масштаб изменений (фронтенд)

- `src/assets/js/components/list-table/filter-panel.tsx` — **2683 строки** (один файл!)
- `src/assets/js/components/list-table/filter-panel-saved-filters.tsx` — 296
- `src/assets/js/components/list-table/table-toolbar.tsx` — 372
- `src/assets/js/components/list-table/list-table.tsx` — 195 (замена старого list-table.tsx)
- `src/assets/js/components/list-table/use-list-table.ts` — 215
- `src/assets/js/components/table/inline-editable-cell.tsx` — 245
- `src/assets/js/pages/user-filters-list.tsx` — 357
- `src/assets/js/components/add-user-form.tsx` — 164 изменений (apiKey UI)
- Удалён старый `src/assets/js/components/list-table.tsx` (432 строки)

---

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ (блокеры)

### [FE-CRIT-1] XSS через `simpleSanitizeHtml` в inline-editable-cell
**Файл:** `src/assets/js/components/table/inline-editable-cell.tsx` ~строки 131, 198  
**Класс:** Stored XSS  

Используется `dangerouslySetInnerHTML` с самописным regex-санитайзером `simpleSanitizeHtml()` из `lib/utils.ts`. Regex-based санитизация HTML **принципиально ненадёжна**:
- `<svg onload=...>` — не ловится правилом `/ on\w+=/` если атрибут разделён переводом строки
- Обход через разные кодировки: `<img src=x on\x0aerror=alert(1)>`
- `data:` URL в `href` не фильтруются
- HTML-parser браузера и regex видят HTML по-разному

**PoC:** значение фильтра `<svg onload="alert(1)">` → сохраняется в sessionStorage → рендерится через dangerouslySetInnerHTML → XSS.

**Фикс:** заменить на DOMPurify, или (лучше) не использовать dangerouslySetInnerHTML — рендерить как plain text через JSX. Поля values фильтров = данные, не HTML.

---

### [FE-CRIT-2] Глобальный объект `window.adminizerFilterPanel`
**Файл:** `filter-panel.tsx` ~строки 345-358

```typescript
(window as any).adminizerFilterPanel = {
    openFilterDialog: () => ...,
    openSaveFilterDialog: () => ...,
    openEditCurrentFilter: (filterId?: string) => ...,
    ...
};
```

**Класс:** Global API exposure + anti-pattern  
Любой сторонний скрипт (включая XSS-инъекции) может вызвать API панели фильтров. Используется для cross-компонентной коммуникации — это должно быть сделано через React Context.

**Фикс:** вынести в React Context (`FilterPanelContext`) с провайдером на уровне layout.

---

### [FE-CRIT-3] CSRF на inline-update без явной настройки
**Файл:** `inline-editable-cell.tsx` ~строки 77-83

```typescript
await axios.patch(`/adminizer/model/${modelName}/inline/${recordId}`, {
    field: fieldName, value: editValue
});
```

Нет явной передачи CSRF токена. Если axios не настроен глобально (через `axios.defaults.headers.common['X-CSRF-TOKEN']` или interceptor от Inertia), PATCH пойдёт без токена → любой сторонний сайт сможет инициировать inline-update из-под сессии пользователя.

**Фикс:** проверить что axios инстанс в `main.tsx` подхватывает CSRF токен из meta/Inertia page props. Явно логировать в dev режиме при отсутствии.

---

## СЕРЬЁЗНЫЕ ПРОБЛЕМЫ

### [FE-ISSUE-1] filter-panel.tsx — 2683 строки в одном файле
**Файл:** `src/assets/js/components/list-table/filter-panel.tsx`

В одном компоненте:
- 40+ `useState`
- 6+ `useEffect`
- 30+ обработчиков / функций
- 3 режима UI (edit conditions, save filter, manage columns)
- Логика API keys, visibility, групп

**Последствия:** невозможно тестировать, весь компонент перерендеривается на каждое изменение, cognitive load запредельный.

**Фикс:** разбить на 3-4 компонента + custom hooks:
```
filter-panel/
  FilterPanel.tsx          (orchestrator, ~150 строк)
  FilterEditPanel.tsx      (редактирование условий)
  FilterSavePanel.tsx      (save dialog + meta)
  ColumnsPanel.tsx         (управление колонками)
  hooks/useSavedFilters.ts
  hooks/useFilterState.ts
  hooks/useColumnState.ts
```

---

### [FE-ISSUE-2] Тройной источник правды для состояния фильтра
**Файл:** `filter-panel.tsx`

Состояние активного фильтра хранится одновременно в:
1. **sessionStorage** — `temporaryFilter_${modelName}`
2. **URL params** — `?filterId=...`
3. **React state** — `activeFilterId`, `activeFilters`, `temporaryFilterData`

Синхронизация между ними ручная + `router.get(..., { preserveState: true })`. Возможны расхождения при навигации назад/вперёд, при смене модели.

**Фикс:** URL как single source of truth. sessionStorage — только для восстановления после reload. React state — производный от URL через custom hook.

---

### [FE-ISSUE-3] useEffect с пустым массивом зависимостей, игнорирующий modelName
**Файл:** `filter-panel.tsx` ~строки 305-325 (loadFilterFields)

```typescript
useEffect(() => {
    const loadFilterFields = async () => { ... };
    loadFilterFields();
}, []);  // modelName отсутствует!
```

Если пользователь переходит между моделями без полной перезагрузки страницы — `availableFields` остаётся от прошлой модели.

**Фикс:** добавить `modelName` в зависимости.

---

### [FE-ISSUE-4] sessionStorage хранит conditions с данными пользователя
**Файл:** `filter-panel.tsx` ~строки 787, 926

```typescript
sessionStorage.setItem(`temporaryFilter_${modelName}`, JSON.stringify({
    name: payload.name,
    conditions: payload.conditions,  // включая value (email, phone, суммы...)
}));
```

sessionStorage не шифруется. Если на соседней вкладке того же origin исполнится XSS (в другом разделе админки) — он прочитает фильтры со значениями.

**Фикс:** хранить в sessionStorage только `filterId` и мета, значения грузить с сервера. Или держать в React state (в памяти).

---

### [FE-ISSUE-5] Нет useCallback/useMemo в filter-panel
Все 30+ обработчиков пересоздаются на каждый render. Каждый Input в списке условий получает новую onChange-ссылку → каскадные перерендеры при большом количестве условий.

**Фикс:** обернуть handlers в useCallback, тяжёлые вычисления (filtered fields, availableOperators) — в useMemo.

---

### [FE-ISSUE-6] URL построение без encoding
**Файл:** `user-filters-list.tsx` ~строка 203

```typescript
window.location.href = `/adminizer/model/${filter.modelName}?filterId=${filter.id}`;
```

Если `filter.modelName` или `filter.id` содержат `?`, `#`, `&` — URL сломается. Не security-проблема (это свои данные), но **баг**.

**Фикс:** через `URL` + `searchParams.set`.

---

## ЗАМЕЧАНИЯ

### [FE-NOTE-1] `any`-касты в filter-panel — 25+
`useState<any>`, `useRef<any>`, `usePage<any>`, `payload: any`, `cond: any`. Теряется type safety на самом сложном компоненте.

**Фикс:** ввести `FilterForEdit`, `FilterPayload`, `ConditionDraft` типы.

---

### [FE-NOTE-2] 12+ `console.error` в filter-panel + user-filters-list
Попадают в production browser console. Раскрывают структуру/эндпоинты при ошибке.

**Фикс:** обернуть в dev-check или вынести в общий `logger`.

---

### [FE-NOTE-3] Hardcoded редирект на login при 401
Жёстко зашит путь. Должен браться из Inertia-контекста / конфига.

---

### [FE-NOTE-4] Нет Error Boundary вокруг FilterPanel
Если `renderFilterInput` упадёт — весь DialogStack сломается, придётся перезагружать страницу.

**Фикс:** обернуть FilterPanel в Error Boundary с fallback UI.

---

### [FE-NOTE-5] Keyboard / a11y неполные
- Popover со значениями условий не закрывается по Escape
- Нет aria-labels на многих dropdown'ах условий
- Focus trap в вложенных диалогах (DialogStack) нужно проверить

---

### [FE-NOTE-6] Search в user-filters-list — возможная гонка
Debounce 300мс есть, но `loading` в зависимостях useEffect. Если старый запрос ещё идёт — новый может прийти раньше и быть перезаписан.

**Фикс:** AbortController на предыдущий запрос.

---

## ИЗБЫТОЧНОСТЬ / DEAD CODE

### [FE-DUP-1] Загрузка saved filters продублирована
`filter-panel.tsx` и `filter-panel-saved-filters.tsx` оба реализуют `GET /adminizer/model/${modelName}/saved-filters`.

**Фикс:** `useSavedFilters(modelName)` hook.

---

### [FE-DUP-2] `window.adminizerFilterPanel` + fallback через DOM
**Файл:** `table-toolbar.tsx` ~строки 164-172

```typescript
const filterPanel = (window as any).adminizerFilterPanel;
if (filterPanel && filterPanel.openFilterDialog) {
    filterPanel.openFilterDialog();
} else {
    const trigger = document.getElementById('filter-panel-trigger')...
    trigger?.click();
}
```

Две стратегии коммуникации параллельно — обе anti-pattern.

**Фикс:** Context API, одна стратегия.

---

### [FE-DUP-3] use-filter-translations.ts — 35 строк, неполная реализация
Возвращает `{ t }`, но логика загрузки переводов минимальна. Либо допилить, либо удалить — переводы уже берутся через общий i18n.

---

## ПОЛОЖИТЕЛЬНЫЕ МОМЕНТЫ

- `add-user-form.tsx` — хорошо сделанный UI для API key: маскировка (•••), show/hide, copy через `navigator.clipboard`, regenerate с подтверждением
- Infinite scroll в `user-filters-list.tsx` через IntersectionObserver — корректная реализация
- Inertia используется консистентно (`router.get`, `usePage`, `preserveState`)
- UI компоненты единообразные (shadcn/ui по всему коммиту)
- Visibility (private / groups / public) реализовано в UI с проверками прав
- Custom handlers для полей фильтра — расширяемая архитектура

---

## ПРИОРИТЕТ ИСПРАВЛЕНИЯ

| # | Issue | Severity |
|---|-------|----------|
| FE-CRIT-1 | XSS через regex-санитайзер | **БЛОКЕР** |
| FE-CRIT-2 | window.adminizerFilterPanel глобал | **БЛОКЕР** |
| FE-CRIT-3 | CSRF на inline-update не явно | **БЛОКЕР (проверка)** |
| FE-ISSUE-1 | 2683 строки в одном компоненте | High |
| FE-ISSUE-2 | 3 источника правды для фильтра | High |
| FE-ISSUE-3 | useEffect без modelName | High (реальный баг) |
| FE-ISSUE-4 | sessionStorage с пользовательскими данными | Medium |
| FE-ISSUE-5 | Нет useCallback/useMemo | Medium (perf) |
| FE-ISSUE-6 | URL без encoding | Medium |
| FE-NOTE-1..6 | any, console, a11y, error boundary, гонка | Low-Medium |

---

## ИТОГ ФРОНТЕНД-РЕВЬЮ

**Вердикт:** не готов к мержу.

Основные требования до мержа:
1. **XSS:** убрать `dangerouslySetInnerHTML` или заменить на DOMPurify
2. **window.adminizerFilterPanel** → React Context
3. **Проверить что CSRF токен реально уходит** с inline-update
4. **Разбить filter-panel.tsx** — 2683 строк в одном файле нельзя поддерживать
5. Починить `useEffect` без `modelName` — реальный баг

---

## ОБЩАЯ СВОДКА ПО ВСЕМУ КОММИТУ (BE + FE)

| Слой | Критические | Серьёзные | Статус |
|------|-------------|-----------|--------|
| Backend (проход 1) | 3 | 6 | ⛔ |
| Backend (проход 2) | 3 | 10 | ⛔ |
| Frontend | 3 | 6 | ⛔ |
| **ИТОГО** | **9 блокеров** | **22 серьёзных** | **⛔ НЕ ГОТОВ** |

Наиболее опасные пункты всех проходов:
- **BE CRIT2-1** — FeedService поднимает пользователя до admin для обхода RLS (архитектурная ошибка безопасности)
- **BE CRIT-2 / FE-CRIT-1** — rawSQL-инъекция и XSS
- **BE CRIT-3** — apiKey plain text

Требуется архитектурный review FeedService + security hardening фильтров и inline-edit перед мержем.
