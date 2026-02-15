# Catalog

## Abstract

The Adminizer catalog system provides a powerful and flexible way to manage hierarchical (tree-shaped) data structures through a unified interface. Catalogs allow creating editors for any data that have parent-child relationships: navigation menus, product categories, document structures, organizational hierarchies, etc.

**Why is this needed:**
- **Unified interface**: one UI component for all tree structures
- **Drag & Drop**: dragging elements to change order and nesting
- **Search with context**: searching for elements with automatic display of the parent chain
- **Contextual actions**: custom operations on elements (export, bulk editing, etc.)
- **Element typing**: different types of elements can coexist in one tree (groups, links, model records)
- **Flexible persistence**: saving to the database through any ORM adapter either via parentId, intermediate link model, or the entire catalog tree at once

**Main features:**
- Creating, editing, deleting elements through modal forms
- Automatic sorting (`sortOrder`) when moving elements
- Multiple catalog instances (e.g., different navigation menus)
- Integration with the Adminizer access rights system
- Support for custom React components for add/edit forms

## Overview

The Adminizer catalog system powers tree-shaped resources such as navigation menus, document hierarchies, or any structure that mixes groups with leaf records. Catalogs expose a uniform contract on the backend and deliver pre-normalised data to the frontend so the UI can render, drag, search, and execute contextual actions without knowing the underlying storage.

Every catalog must be registered in the global [`CatalogHandler`](#cataloghandler). Adminizer exposes the catalog UI at `/admin/catalog/:slug/:id?`, where `slug` selects the catalog and the optional `id` points to a specific storage instance (for example, a navigation section).

## Runtime Architecture

### AbstractCatalog
`src/lib/catalog/AbstractCatalog.ts:119` defines the abstract base class for any catalog. Its responsibilities:
- Storing catalog metadata (`id`, `name`, `slug`, `icon` and flag `movingGroupsRootOnly`);
- Managing registered element types (`itemTypes`) and global action handlers (`actionHandlers`);
- Delegating CRUD, templates and search queries to the correct element type via `getItemType`;
- Providing helper methods for the controller (`getChilds`, `getActions`, `handleAction`, `getLink`, `getPopUpTemplate`, `createItem`, `updateItem`, `updateModelItems`, `deleteItem`, `getitemTypes`, `search`);
- Registering a catalog-specific access rights token (`catalog-${slug}` or `catalog-${slug}-${id}`) for uniform rights checking.

`AbstractCatalog` expects concrete implementations to provide `name`, `slug`, `icon` and a list of element type instances via the constructor. Optional catalog-level actions can be added via `addActionHandler`. When `selectedItemTypes` is empty, the handler is considered global; otherwise, it is attached to each matching element type.

### BaseItem, AbstractGroup, AbstractItem
`BaseItem<T extends Item>` models the type of an individual catalog element. Concrete implementations provide:
- Static metadata (`type`, `name`, `icon`, `allowedRoot`, flag `isGroup`);
- Connectors to the Adminizer environment (`adminizer`, optional reference to `storageServices` for shared persistence);
- Data access methods (`find`, `create`, `update`, `deleteItem`, `updateModelItems`, `getChilds`, `search`);
- UI template factories (`getAddTemplate`, `getEditTemplate`), returning either a path to a React component, or a navigation template, or a model-based selector.

`BaseItem` enriches each returned record with `type` and `icon` fields via the `_enrich` method so that the frontend can render unified nodes. Helper methods `_find` and `_getChilds` apply this enrichment automatically. `AbstractGroup` and `AbstractItem` provide sensible defaults for grouping (`type: "group"`, `icon: "folder"`, `isGroup: true`) and leaf elements (`isGroup: false`).

### ActionHandler
Action handlers describe operations that can be invoked from the context menu or toolbar. The abstract contract in `src/lib/catalog/AbstractCatalog.ts:203` provides:
- `type`: either `basic`, `external`, or `link`;
- `displayContext` / `displayTool`: placement hints for UI;
- `selectedItemTypes`: restricts handlers to specific element `type` values; empty array means the handler is global;
- `id`, `name`, `icon`: UI descriptors;
- `getPopUpTemplate`, `getLink`: template providers for `external` and `link` actions;
- `handler`: backend implementation that receives permitted `Item` entities plus optional payload.

Handlers are discovered via `AbstractCatalog.getActions`. `FrontendCatalog.getActions` filters them for use in context or toolbar before returning data to the client.

## Request Lifecycle
`catalogController` (`src/controllers/catalog/Catalog.ts`) handles HTTP traffic:
- Checks access rights using the rights token registered by the catalog;
- Resolves the catalog by slug and optional storage `id` (also used to get permitted IDs via `getIdList`);
- For `GET` requests renders the Inertia page `catalog`;
- For `POST`, `PUT` and `DELETE` requests creates a `FrontendCatalog` instance and dispatches operations based on `_method`.

The controller currently supports the following `_method` values:
- `getCatalog`: returns the tree, available element types, catalog metadata and toolbar actions;
- `getChilds`, `createItem`, `updateItem`, `deleteItem`: CRUD endpoints working with specific nodes;
- `getAddTemplate`, `getEditTemplate`: provide UI payloads for modal forms or custom components;
- `search`: returns tagged search results along with their ancestors and siblings;
- `getActions`, `handleAction`, `getLink`, `getPopUpTemplate`: execute or describe action handlers;
- `updateTree`: saves order and parent changes on drag-and-drop, recalculating `sortOrder` and `parentId` of each node.

## Frontend Adapter
`FrontendCatalog` (`src/controllers/catalog/FrontendCatalogAdapter.ts`) wraps a catalog instance and normalizes responses for the React tree view. Main responsibilities include:
- Converting backend elements to `NodeModel` instances (`FrontendCatalogUtils.arrayToNode`, `treeToNode`);
- Replacing `null` parent IDs with `0` for UI and restoring them on write (`normalizeForFrontend`, `refinement`);
- Resolving localized catalog UI strings via `getLocales` so the client can display multilingual labels;
- Recursively deleting nodes with `deleteItem` to ensure that deleting a group also cleans up its descendants before backend cleanup.

The helper class `FrontendCatalogUtils` contains stateless converters that React components use directly. When adding new element data points, update these utilities so the frontend continues to receive complete node descriptors.

## Creating a Custom Catalog
1. **Develop a storage strategy for elements.** Decide how catalog data will be stored. Follow the `StorageService` example or implement persistence API directly in each element type.
2. **Implement element types.** Extend `AbstractGroup` for folders and `AbstractItem` for leaf records. Provide required metadata, CRUD methods and templates. Use `_enrich` via provided helpers if returning raw entities.
3. **Assemble the catalog.** Create a subclass of `AbstractCatalog`, instantiate element types and call `super(adminizer, itemTypes)`. Optionally configure action handlers and override `getIdList` when the catalog supports multiple storage instances.
4. **Register the catalog.** During Adminizer boot add the catalog to the global handler: `adminizer.catalogHandler.add(new MyCatalog(adminizer));` as shown in `src/lib/catalog/CatalogHandler.ts`.
5. **Provide storage identifiers.** If the catalog uses multiple roots, add them to `idList` so the controller can validate incoming `/catalog/:slug/:id` requests.

## CatalogHandler
`src/lib/catalog/CatalogHandler.ts` stores registered catalogs in memory. It provides three methods:
- `add(catalog: AbstractCatalog)`: stores the catalog instance and returns it;
- `getAll()`: lists all registered catalogs (useful for diagnostics or dashboards);
- `getCatalog(slug: string)`: retrieves the catalog by slug that the controller gets from the request.

Call `CatalogHandler.add` during Adminizer initialization so the catalog becomes available at `/admin/catalog/:slug`.

## Example: Simple Product Catalog

An example of a simple product catalog where groups (categories) and products are linked via `parentId`. It is assumed that `Group` and `Product` models are already defined in Sequelize with fields `id`, `name`, `parentId`, `sortOrder` and `description` for products.

### Catalog Implementation

```typescript
// lib/catalog/ProductCatalog.ts
import { AbstractCatalog, AbstractGroup, AbstractItem, Item } from './AbstractCatalog';
import { Adminizer } from '../Adminizer';
import Group from '../../models/Group';
import Product from '../../models/Product';

interface CatalogItem extends Item {
  description?: string;
}

// Product Group
class ProductGroup extends AbstractGroup<CatalogItem> {
  readonly type = 'group';
  readonly name = 'Product Group';
  readonly icon = 'folder';
  readonly allowedRoot = true;

  constructor(protected adminizer: Adminizer) {
    super();
  }

  async find(itemId: string | number): Promise<CatalogItem> {
    const group = await Group.findByPk(itemId);
    if (!group) throw new Error('Group not found');
    
    return {
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    };
  }

  async create(data: any): Promise<CatalogItem> {
    const group = await Group.create({
      name: data.name,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder || 0,
    });

    return {
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    };
  }

  async update(itemId: string | number, data: CatalogItem): Promise<CatalogItem> {
    const group = await Group.findByPk(itemId);
    if (!group) throw new Error('Group not found');
    
    await group.update({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });

    return {
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    };
  }

  async deleteItem(itemId: string | number): Promise<void> {
    await Group.destroy({ where: { id: itemId } });
  }

  async getChilds(parentId: string | number | null): Promise<CatalogItem[]> {
    const groups = await Group.findAll({
      where: { parentId },
      order: [['sortOrder', 'ASC']],
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    }));
  }

  async search(s: string): Promise<CatalogItem[]> {
    const groups = await Group.findAll({
      where: {
        name: { [Op.iLike]: `%${s}%` },
      },
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    }));
  }

  async getAddTemplate(req: any): Promise<any> {
    return {
      type: 'model',
      data: {
        model: 'Group',
        items: [],
        labels: {
          title: req.i18n.__('Add Group'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }

  async getEditTemplate(id: string | number, catalogId: string, req: any): Promise<any> {
    const item = await this.find(id);
    return {
      type: 'model',
      data: {
        item,
        model: 'Group',
        labels: {
          title: req.i18n.__('Edit Group'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }
}

// Product
class ProductItem extends AbstractItem<CatalogItem> {
  readonly type = 'product';
  readonly name = 'Product';
  readonly icon = 'shopping_cart';
  readonly allowedRoot = false;

  constructor(protected adminizer: Adminizer) {
    super();
  }

  async find(itemId: string | number): Promise<CatalogItem> {
    const product = await Product.findByPk(itemId);
    if (!product) throw new Error('Product not found');
    
    return {
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    };
  }

  async create(data: any): Promise<CatalogItem> {
    const product = await Product.create({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder || 0,
      description: data.description || '',
    });

    return {
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    };
  }

  async update(itemId: string | number, data: CatalogItem): Promise<CatalogItem> {
    const product = await Product.findByPk(itemId);
    if (!product) throw new Error('Product not found');
    
    await product.update({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
      description: data.description,
    });

    return {
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    };
  }

  async deleteItem(itemId: string | number): Promise<void> {
    await Product.destroy({ where: { id: itemId } });
  }

  async getChilds(parentId: string | number | null): Promise<CatalogItem[]> {
    const products = await Product.findAll({
      where: { parentId },
      order: [['sortOrder', 'ASC']],
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    }));
  }

  async search(s: string): Promise<CatalogItem[]> {
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${s}%` } },
          { description: { [Op.iLike]: `%${s}%` } },
        ],
      },
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    }));
  }

  async getAddTemplate(req: any): Promise<any> {
    return {
      type: 'model',
      data: {
        model: 'Product',
        labels: {
          title: req.i18n.__('Add Product'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }

  async getEditTemplate(id: string | number, catalogId: string, req: any): Promise<any> {
    const item = await this.find(id);
    return {
      type: 'model',
      data: {
        item,
        model: 'Product',
        labels: {
          title: req.i18n.__('Edit Product'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }
}

// Product Catalog
export class ProductCatalog extends AbstractCatalog {
  readonly name = 'Product Catalog';
  readonly slug = 'products';
  readonly icon = 'inventory';

  constructor(adminizer: Adminizer) {
    const itemTypes = [
      new ProductGroup(adminizer),
      new ProductItem(adminizer),
    ];
    super(adminizer, itemTypes);
  }
}
```

### Catalog Registration

```typescript
// In the Adminizer initialization file
import { ProductCatalog } from './lib/catalog/ProductCatalog';

const adminizer = new Adminizer(/* config */);

// Register the catalog
adminizer.catalogHandler.add(new ProductCatalog(adminizer));
```

Now the catalog will be available at `/admin/catalog/products` and will allow managing the hierarchy of groups and products through the drag & drop interface.

## Обзор

The Adminizer catalog system powers tree-shaped resources such as navigation menus, document hierarchies, or any structure that mixes groups with leaf records. Catalogs expose a uniform contract on the backend and deliver pre-normalised data to the frontend so the UI can render, drag, search, and execute contextual actions without knowing the underlying storage.

Every catalog must be registered in the global [`CatalogHandler`](#cataloghandler). Adminizer exposes the catalog UI at `/admin/catalog/:slug/:id?`, where `slug` selects the catalog and the optional `id` points to a specific storage instance (for example, a navigation section).

## Runtime Architecture

### AbstractCatalog
`src/lib/catalog/AbstractCatalog.ts:119` определяет абстрактный базовый класс для любого каталога. Его обязанности:
- Хранение метаданных каталога (`id`, `name`, `slug`, `icon` и флаг `movingGroupsRootOnly`);
- Управление зарегистрированными типами элементов (`itemTypes`) и глобальными обработчиками действий (`actionHandlers`);
- Делегирование CRUD, шаблонов и поисковых запросов правильному типу элемента через `getItemType`;
- Предоставление вспомогательных методов для контроллера (`getChilds`, `getActions`, `handleAction`, `getLink`, `getPopUpTemplate`, `createItem`, `updateItem`, `updateModelItems`, `deleteItem`, `getitemTypes`, `search`);
- Регистрация специфичного для каталога токена прав доступа (`catalog-${slug}` или `catalog-${slug}-${id}`) для единообразной проверки прав.

`AbstractCatalog` ожидает, что конкретные реализации предоставят `name`, `slug`, `icon` и список экземпляров типов элементов через конструктор. Опциональные действия уровня каталога можно добавить через `addActionHandler`. Когда `selectedItemTypes` пуст, обработчик считается глобальным; в противном случае он прикрепляется к каждому совпадающему типу элемента.

### BaseItem, AbstractGroup, AbstractItem
`BaseItem<T extends Item>` моделирует тип отдельного элемента каталога. Конкретные реализации предоставляют:
- Статические метаданные (`type`, `name`, `icon`, `allowedRoot`, флаг `isGroup`);
- Коннекторы к окружению Adminizer (`adminizer`, опциональная ссылка на `storageServices` для общей персистентности);
- Методы доступа к данным (`find`, `create`, `update`, `deleteItem`, `updateModelItems`, `getChilds`, `search`);
- Фабрики UI-шаблонов (`getAddTemplate`, `getEditTemplate`), возвращающие либо путь к React-компоненту, либо шаблон навигации, либо селектор на основе модели.

`BaseItem` обогащает каждую возвращаемую запись полями `type` и `icon` через метод `_enrich`, чтобы фронтенд мог рендерить унифицированные узлы. Вспомогательные методы `_find` и `_getChilds` применяют это обогащение автоматически. `AbstractGroup` и `AbstractItem` предоставляют разумные значения по умолчанию для группировки (`type: "group"`, `icon: "folder"`, `isGroup: true`) и листовых элементов (`isGroup: false`).

### ActionHandler
Обработчики действий описывают операции, которые могут быть вызваны из контекстного меню или панели инструментов. Абстрактный контракт в `src/lib/catalog/AbstractCatalog.ts:203` предоставляет:
- `type`: либо `basic`, `external`, либо `link`;
- `displayContext` / `displayTool`: подсказки размещения для UI;
- `selectedItemTypes`: ограничивает обработчики определенными значениями `type` элемента; пустой массив означает, что обработчик глобальный;
- `id`, `name`, `icon`: дескрипторы UI;
- `getPopUpTemplate`, `getLink`: провайдеры шаблонов для действий `external` и `link`;
- `handler`: бэкенд-реализация, которая получает разрешенные сущности `Item` плюс опциональный payload.

Обработчики обнаруживаются через `AbstractCatalog.getActions`. `FrontendCatalog.getActions` фильтрует их для использования в контексте или панели инструментов перед возвратом данных клиенту.


## Жизненный цикл запроса
`catalogController` (`src/controllers/catalog/Catalog.ts`) обрабатывает HTTP-трафик:
- Проверяет права доступа используя токен прав доступа, зарегистрированный каталогом;
- Разрешает каталог по slug и опциональному `id` хранилища (также используется для получения разрешенных ID через `getIdList`);
- Для `GET` запросов рендерит Inertia-страницу `catalog`;
- Для `POST`, `PUT` и `DELETE` запросов создает экземпляр `FrontendCatalog` и диспетчеризует операции на основе `_method`.

Контроллер в настоящее время поддерживает следующие значения `_method`:
- `getCatalog`: возвращает дерево, доступные типы элементов, метаданные каталога и действия панели инструментов;
- `getChilds`, `createItem`, `updateItem`, `deleteItem`: CRUD-эндпоинты, работающие с конкретными узлами;
- `getAddTemplate`, `getEditTemplate`: предоставляют UI-полезные нагрузки для модальных форм или кастомных компонентов;
- `search`: возвращает помеченные результаты поиска вместе с их предками и соседями;
- `getActions`, `handleAction`, `getLink`, `getPopUpTemplate`: выполняют или описывают обработчики действий;
- `updateTree`: сохраняет изменения порядка и родителей при drag-and-drop, пересчитывая `sortOrder` и `parentId` каждого узла.

## Frontend Adapter (Адаптер фронтенда)
`FrontendCatalog` (`src/controllers/catalog/FrontendCatalogAdapter.ts`) оборачивает экземпляр каталога и нормализует ответы для React-представления дерева. Основные обязанности включают:
- Конвертирование backend-элементов в экземпляры `NodeModel` (`FrontendCatalogUtils.arrayToNode`, `treeToNode`);
- Замену `null` parent IDs на `0` для UI и восстановление их при записи (`normalizeForFrontend`, `refinement`);
- Разрешение локализованных UI-строк каталогов через `getLocales`, чтобы клиент мог отображать мультиязычные метки;
- Рекурсивное удаление узлов с помощью `deleteItem` для гарантии, что удаление группы также очищает её потомков перед очисткой на бэкенде.

Вспомогательный класс `FrontendCatalogUtils` содержит stateless-конвертеры, которые React-компоненты используют напрямую. При добавлении новых точек данных элементов, обновляйте эти утилиты, чтобы фронтенд продолжал получать полные дескрипторы узлов.

## Создание кастомного каталога
1. **Разработайте стратегию хранения элементов.** Решите, как будут сохраняться данные каталога. Следуйте примеру `StorageService` или реализуйте API персистентности прямо в каждом типе элемента.
2. **Реализуйте типы элементов.** Расширьте `AbstractGroup` для папок и `AbstractItem` для листовых записей. Предоставьте требуемые метаданные, CRUD-методы и шаблоны. Используйте `_enrich` через предоставленные хелперы, если возвращаете сырые сущности.
3. **Соберите каталог.** Создайте подкласс `AbstractCatalog`, создайте экземпляры типов элементов и вызовите `super(adminizer, itemTypes)`. Опционально настройте обработчики действий и переопределите `getIdList`, когда каталог поддерживает множественные экземпляры хранилища.
4. **Зарегистрируйте каталог.** Во время загрузки Adminizer добавьте каталог в глобальный обработчик: `adminizer.catalogHandler.add(new MyCatalog(adminizer));` как показано в `src/lib/catalog/CatalogHandler.ts`.
5. **Предоставьте идентификаторы хранилища.** Если каталог использует множественные корни, добавьте их в `idList`, чтобы контроллер мог валидировать входящие запросы `/catalog/:slug/:id`.

## CatalogHandler
`src/lib/catalog/CatalogHandler.ts` хранит зарегистрированные каталоги в памяти. Он предоставляет три метода:
- `add(catalog: AbstractCatalog)`: сохраняет экземпляр каталога и возвращает его;
- `getAll()`: перечисляет все зарегистрированные каталоги (полезно для диагностики или дашбордов);
- `getCatalog(slug: string)`: получает каталог по slug, который контроллер получает из запроса.

Вызывайте `CatalogHandler.add` во время инициализации Adminizer, чтобы каталог стал доступен по адресу `/admin/catalog/:slug`.

## Пример: Простой продукт каталог

Пример простого каталога продуктов, где группы (категории) и продукты связаны через `parentId`. Предполагается, что модели `Group` и `Product` уже определены в Sequelize с полями `id`, `name`, `parentId`, `sortOrder` и `description` для продуктов.

### Реализация каталога

```typescript
// lib/catalog/ProductCatalog.ts
import { AbstractCatalog, AbstractGroup, AbstractItem, Item } from './AbstractCatalog';
import { Adminizer } from '../Adminizer';
import Group from '../../models/Group';
import Product from '../../models/Product';

interface CatalogItem extends Item {
  description?: string;
}

// Product group
class ProductGroup extends AbstractGroup<CatalogItem> {
  readonly type = 'group';
  readonly name = 'Product Group';
  readonly icon = 'folder';
  readonly allowedRoot = true;

  constructor(protected adminizer: Adminizer) {
    super();
  }

  async find(itemId: string | number): Promise<CatalogItem> {
    const group = await Group.findByPk(itemId);
    if (!group) throw new Error('Group not found');
    
    return {
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    };
  }

  async create(data: any): Promise<CatalogItem> {
    const group = await Group.create({
      name: data.name,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder || 0,
    });

    return {
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    };
  }

  async update(itemId: string | number, data: CatalogItem): Promise<CatalogItem> {
    const group = await Group.findByPk(itemId);
    if (!group) throw new Error('Group not found');
    
    await group.update({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    });

    return {
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    };
  }

  async deleteItem(itemId: string | number): Promise<void> {
    await Group.destroy({ where: { id: itemId } });
  }

  async getChilds(parentId: string | number | null): Promise<CatalogItem[]> {
    const groups = await Group.findAll({
      where: { parentId },
      order: [['sortOrder', 'ASC']],
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    }));
  }

  async search(s: string): Promise<CatalogItem[]> {
    const groups = await Group.findAll({
      where: {
        name: { [Op.iLike]: `%${s}%` },
      },
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      type: this.type,
      icon: this.icon,
    }));
  }

  async getAddTemplate(req: any): Promise<any> {
    return {
      type: 'model',
      data: {
        model: 'Group',
        items: [],
        labels: {
          title: req.i18n.__('Add Group'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }

  async getEditTemplate(id: string | number, catalogId: string, req: any): Promise<any> {
    const item = await this.find(id);
    return {
      type: 'model',
      data: {
        item,
        model: 'Group',
        labels: {
          title: req.i18n.__('Edit Group'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }
}

// Product
class ProductItem extends AbstractItem<CatalogItem> {
  readonly type = 'product';
  readonly name = 'Product';
  readonly icon = 'shopping_cart';
  readonly allowedRoot = false;

  constructor(protected adminizer: Adminizer) {
    super();
  }

  async find(itemId: string | number): Promise<CatalogItem> {
    const product = await Product.findByPk(itemId);
    if (!product) throw new Error('Product not found');
    
    return {
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    };
  }

  async create(data: any): Promise<CatalogItem> {
    const product = await Product.create({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder || 0,
      description: data.description || '',
    });

    return {
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    };
  }

  async update(itemId: string | number, data: CatalogItem): Promise<CatalogItem> {
    const product = await Product.findByPk(itemId);
    if (!product) throw new Error('Product not found');
    
    await product.update({
      name: data.name,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
      description: data.description,
    });

    return {
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    };
  }

  async deleteItem(itemId: string | number): Promise<void> {
    await Product.destroy({ where: { id: itemId } });
  }

  async getChilds(parentId: string | number | null): Promise<CatalogItem[]> {
    const products = await Product.findAll({
      where: { parentId },
      order: [['sortOrder', 'ASC']],
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    }));
  }

  async search(s: string): Promise<CatalogItem[]> {
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${s}%` } },
          { description: { [Op.iLike]: `%${s}%` } },
        ],
      },
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      parentId: product.parentId,
      sortOrder: product.sortOrder,
      type: this.type,
      icon: this.icon,
      description: product.description,
    }));
  }

  async getAddTemplate(req: any): Promise<any> {
    return {
      type: 'model',
      data: {
        model: 'Product',
        labels: {
          title: req.i18n.__('Add Product'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }

  async getEditTemplate(id: string | number, catalogId: string, req: any): Promise<any> {
    const item = await this.find(id);
    return {
      type: 'model',
      data: {
        item,
        model: 'Product',
        labels: {
          title: req.i18n.__('Edit Product'),
          save: req.i18n.__('Save'),
        },
      },
    };
  }
}

// Product catalog
export class ProductCatalog extends AbstractCatalog {
  readonly name = 'Product Catalog';
  readonly slug = 'products';
  readonly icon = 'inventory';

  constructor(adminizer: Adminizer) {
    const itemTypes = [
      new ProductGroup(adminizer),
      new ProductItem(adminizer),
    ];
    super(adminizer, itemTypes);
  }
}
```

### Регистрация каталога

```typescript
// In the Adminizer bootstrap file
import { ProductCatalog } from './lib/catalog/ProductCatalog';

const adminizer = new Adminizer(/* config */);

// Catalog registration
adminizer.catalogHandler.add(new ProductCatalog(adminizer));
```

Теперь каталог будет доступен по адресу `/admin/catalog/products` и позволит управлять иерархией групп и продуктов через drag & drop интерфейс.
