import { JSONSchema4 } from "json-schema";
import { Adminizer } from "../Adminizer";

export interface CatalogStorageServices {}

/**
 * Interface `Item` describes the data that the UI will operate on
 * This is a common interface for all data that is linked to the catalog
 * This data will also be sent to crud Item
 * */
export interface Item {
    id: string | number;
    name: string;
    parentId: string | number | null;

    /**
     *
     */
    childs?: Item[];

    sortOrder: number

    // below: AbstractGroup layer - It means data to be mapped from itemType class
    icon: string
    type: string;

    // below: service marks for Frontend Component
    marked?: boolean
}

export type _Item_ = {
    [key: string]: boolean | string | number | object;
};

export interface CatalogTemplate<TData = any> {
    type: string;
    data: TData;
}

/**
 * General Item structure that will be available for all elements, including groups
 */
export abstract class BaseItem<T extends Item> {
    storageServices?: CatalogStorageServices
    // public abstract readonly id: string;
    public abstract readonly type: string;

    /**
     * Used for infer T
     * I haven't found an easier way to extract this type that goes into generic
     * If you know how to open PR
     * */
    // public readonly dataType: T

    public abstract adminizer: Adminizer

    /**
     * Catalog name
     */
    public abstract readonly name: string;
    /**
     * A sign that this is a group
     */
    public abstract readonly isGroup: boolean;

    /**
     * Is it allowed or not to add an element to the root
     */
    public abstract readonly allowedRoot: boolean

    /**
     *  icon (url or id)
     */
    public abstract readonly icon: string;

    /**
     * Array of all global contexts, which will appear for all elements
     */
    public readonly actionHandlers: ActionHandler[]

    /**
     * Adds the context menu processor
     */
    public addActionHandler(contextHandler: ActionHandler) {
        this.actionHandlers.push(contextHandler);
    }

    /**
     * Adds the required fields
     * @param item
     */
    public _enrich(item: T): void {
        item.icon = this.icon;
        item.type = this.type;
    }

    public async _find(itemId: string | number, catalogId: string, req?: ReqType): Promise<T> {
        let item = await this.find(itemId, catalogId, req);
        this._enrich(item);
        return item;
    }

    public abstract find(itemId: string | number, catalogId: string, req?: ReqType): Promise<T>;

    /**
     * Is false because default value Group is added
     */
    public abstract update(itemId: string | number, data: T, catalogId: string, req?: ReqType): Promise<T>;

    /**
     *
     * @param modelId
     * @param data
     * @param catalogId
     * @param req
     */
    public abstract updateModelItems(modelId: string | number, data: any, catalogId: string, req?: ReqType): Promise<T>;

    /**
     * Create catalog
     * @param data
     * @param catalogId
     * @param req
     */
    public abstract create(data: T, catalogId: string, req?: ReqType): Promise<T>;

    /**
     *  delete element
     */
    public abstract deleteItem(itemId: string | number, catalogId: string, req?: ReqType): Promise<void>;

    /**
     * get add template
     * @param req
     */
    public abstract getAddTemplate(req: ReqType): Promise<CatalogTemplate>

    /**
     * get edit template
     * @param id
     * @param catalogId
     * @param req
     * @param modelId
     */
    public abstract getEditTemplate(
        id: string | number,
        catalogId: string,
        req: ReqType,
        modelId?: string | number
    ): Promise<CatalogTemplate>;

    public async _getChilds(parentId: string | number, catalogId: string, req?: ReqType): Promise<Item[]> {
        let items = await this.getChilds(parentId, catalogId, req);
        items.forEach((item) => {
            this._enrich(item as T);
        });
        return items;
    }

    public abstract getChilds(parentId: string | number, catalogId: string, req?: ReqType): Promise<Item[]>;

    public abstract search(s: string, catalogId: string, req?: ReqType): Promise<T[]>
}


export abstract class AbstractGroup<T extends Item> extends BaseItem<T> {
    public readonly type: string = "group";
    public readonly isGroup: boolean = true;
    public icon: string = "folder";
}

export abstract class AbstractItem<T extends Item> extends BaseItem<T> {
    public readonly isGroup: boolean = false;
}

/// ContextHandler
export abstract class ActionHandler {
    /**
     * Three actions are possible, without configuration, configuration via pop-up, and just external action
     * For the first two, a handler is provided, but the third type of action simply calls the HTML in the popup; the controller will be implemented externally
     * */
    public abstract readonly type:
        "basic" |
        "external" |
        "link"

    /**
     * Will be shown in the context menu section
     */
    public abstract readonly displayContext: boolean
    /**
     * Will be shown in the toolbox section
     */
    public abstract readonly displayTool: boolean

    /**
     * For "external"
     */
    public abstract getPopUpTemplate(req?: ReqType): Promise<string>


    /**
     * Only for link type
     */
    public abstract getLink(data?: any): Promise<string>


    /**
     * For which elements the action can be used
     */
    public readonly selectedItemTypes: string[]

    /**
     * icon (url or id)
     */
    public abstract readonly id: string;

    public abstract readonly icon: string;

    public abstract readonly name: string

    /**
     * Implementation of a method that will do something with elements.
     * there's really not much you can do with the context menu
     * @param items
     * @param data
     * @param req
     */
    public abstract handler(items: Item[], data?: any, req?: ReqType): Promise<void | string>;

}

/**
 *
 Abstract
 ____    _  _____  _    _     ___   ____
 / ___|  / \|_   _|/ \  | |   / _ \ / ___|
 | |     / _ \ | | / _ \ | |  | | | | |  _
 | |___ / ___ \| |/ ___ \| |__| |_| | |_| |
 \____/_/   \_|_/_/   \_|_____\___/ \____|


 */
export abstract class AbstractCatalog {
    /**
     * id for catalog please use id format
     *
     *    */
    public id: string;
    /**
     * Catalog name
     */
    public abstract readonly name: string;
    /**
     * Catalog slug
     */
    public abstract readonly slug: string;

    /**
     * moving groups to the root only
     */
    public movingGroupsRootOnly: boolean = false


    /**
     * Array of all global contexts, which will appear for all elements
     */
    public readonly actionHandlers: ActionHandler[]

    /**
     * icon (url or id)
     */
    public abstract readonly icon: string;

    /**
     * List of element types
     */
    public readonly itemTypes: BaseItem<Item>[] = [];


    /**
     * Method for getting childs elements
     * if pass null as parentId this root
     */
    public async getChilds(parentId: string | number, byItemType?: string, req?: ReqType): Promise<Item[]> {
        if (byItemType) {
            const items = await this.getItemType(byItemType)?._getChilds(parentId, this.id, req);
            return items ? items.sort((a, b) => a.sortOrder - b.sortOrder) : [];
        } else {
            let result: Item[] = [];
            for (const itemType of this.itemTypes) {
                const items = await itemType?._getChilds(parentId, this.id, req);
                if (items) {
                    result = result.concat(items);
                }
            }
            return result.sort((a, b) => a.sortOrder - b.sortOrder);
        }
    }

    /**
     * Registers the catalog access right through the legacy Adminizer API.
     *
     * @deprecated Starting with Adminizer v6, register access rights through
     * `ctx.accessRight(...)` in the app's `setup` method.
     * @param adminizer Adminizer instance used for legacy access-right registration.
     */
    private _bindAccessRight(adminizer: Adminizer) {
        setTimeout(() => {
            const postfix = this.id ? `${this.slug}-${this.id}` : `${this.slug}`
            adminizer.accessRightsHelper.registerToken({
                id: `catalog-${postfix}`,
                name: this.name,
                description: `Access to edit catalog for ${postfix}`,
                department: 'catalog'
            });
        }, 100)
    }

    /**
     * @deprecated The `adminizer` parameter is deprecated and will be removed in
     * Adminizer v6. Register the catalog through `AppManager` using
     * `ctx.catalog(...)`, and register its access rights using
     * `ctx.accessRight(...)`.
     * @param adminizer Adminizer instance used by the legacy registration flow.
     * @param items Catalog item types.
     */
    protected constructor(adminizer: Adminizer, items: BaseItem<any>[]) {
        for (const item of items) {
            this.additemTypes(item)
        }
        this._bindAccessRight(adminizer)
    }

    public setId(id: string) {
        this.id = id
    }

    /**
     * Gettind id list method
     * @info This is a dummy method, please make realization in sub class
     */
    public async getIdList(): Promise<string[]> {
        return []
    }

    public getItemType(type: string) {
        return this.itemTypes.find((it) => it.type === type);
    }

    private requireItemType(type: string): BaseItem<Item> {
        const itemType = this.getItemType(type);
        if (!itemType) {
            throw new Error(`Catalog item type \`${String(type)}\` was not found in catalog \`${this.slug}\``);
        }
        return itemType;
    }

    public getGroupType() {
        return this.itemTypes.find((it) => it.isGroup === true);
    }

    public additemTypes<T extends BaseItem<any>>(itemType: T) {
        if (
            itemType.isGroup === true &&
            this.itemTypes.find((it) => it.isGroup === true)
        ) {
            throw new Error(`Only one type group is allowed`);
        }
        this.itemTypes.push(itemType);
    }

    /**
     *  Get an element
     */
    public async find(item: Item, req?: ReqType) {
        return await this.requireItemType(item.type)._find(item.id, this.id, req);
    }

    /**
     *  Removing an element
     */
    public async deleteItem(type: string, id: string | number, req?: ReqType) {
        await this.requireItemType(type).deleteItem(id, this.id, req);
    }

    /**
     * Get edit template from an item type
     * @param item
     * @param id
     * @param req
     * @param modelId
     */
    public getEditTemplate(item: Item, id: string | number, req: ReqType, modelId?: string | number) {
        return this.requireItemType(item.type).getEditTemplate(id, this.id, req, modelId);
    }

    /**
     * Get add template from an item type
     * @param item
     * @param req
     */
    public getAddTemplate(item: Item, req: ReqType) {
        return this.requireItemType(item.type).getAddTemplate(req);
    }

    public addActionHandler(actionHandler: ActionHandler) {
        if (actionHandler.selectedItemTypes.length > 0) {
            for (let actionItem of actionHandler.selectedItemTypes) {
                this.getItemType(actionItem).addActionHandler(actionHandler)
            }

        } else {
            this.actionHandlers.push(actionHandler);
        }
    }

    /**
     * Method for getting group elements
     * If there are several Items, then the global ones will be obtained
     */
    public getActions(items?: Item[]) {
        if (items.length === 1) {
            const item = items[0];
            const itemType = this.itemTypes.find((it) => it.type === item.type);
            return itemType.actionHandlers
        } else {
            return this.actionHandlers
        }
    }


    /**
     * Implements search and execution of a specific action handler
     */
    public async handleAction(actionId: string, items?: Item[], data?: any, req?: ReqType): Promise<void | string> {
        let action: ActionHandler = null;
        if (items.length === 1) {
            const item = items[0];
            const itemType = this.itemTypes.find((it) => it.type === item.type);
            if (itemType && itemType.actionHandlers && itemType.actionHandlers.length) {
                action = itemType.actionHandlers.find((it) => it.id === actionId);
            }
        }

        if (!action) {
            action = this.actionHandlers.find((it) => it.id === actionId);
        }

        if (!action) throw `Action with id \`${actionId}\` not found`
        return await action.handler(items, data, req);
    }


    /**
     * Only For a Link action
     * @param actionId
     */
    public async getLink(actionId: string) {
        return this.actionHandlers.find((it) => it.id === actionId)?.getLink();
    }

    /**
     * For Extermal and actions
     * @param actionId
     * @param req
     */
    public async getPopUpTemplate(actionId: string, req?: ReqType) {
        return this.actionHandlers.find((it) => it.id === actionId)?.getPopUpTemplate(req);
    }

    /**
     *
     * @param data
     * @param req
     */
    public async createItem<T extends Item>(data: T, req?: ReqType): Promise<T> {
        const result = await this.requireItemType(data.type).create(data, this.id, req) as T;
        if (!result) {
            throw new Error(`Catalog item type \`${data.type}\` did not return created item`);
        }
        return result
    }


    public async updateItem<T extends Item>(id: string | number, type: string, data: T, req?: ReqType): Promise<T> {
        const result = await this.requireItemType(type).update(id, data, this.id, req) as T;
        if (!result) {
            throw new Error(`Catalog item type \`${type}\` did not return updated item`);
        }
        return result
    }

    /**
     * To update all items in the tree after updating the model
     * @param modelId
     * @param type
     * @param data
     * @param req
     */
    public async updateModelItems<T extends Item>(modelId: string | number, type: string, data: T, req?: ReqType): Promise<T> {
        const result = await this.requireItemType(type).updateModelItems(modelId, data, this.id, req) as T;
        if (!result) {
            throw new Error(`Catalog item type \`${type}\` did not return updated model item`);
        }
        return result
    }

    /**
     * Method for getting group elements
     */
    public getitemTypes() {
        return this.itemTypes.map(({ adminizer, storageServices, ...rest }) => rest);
    };


    async search<T extends Item>(s: string, hasExtras: boolean = true, req?: ReqType): Promise<T[]> {
        // Build the trees for all found items
        const accumulator: Item[] = [];

        // Find group type
        const groupType = this.itemTypes.find((item) => item.isGroup === true);

        // Recursive function to build the tree upwards
        const buildTreeUpwards = async (item: Item, hasExtras: boolean): Promise<Item> => {
            // Add extras
            if (hasExtras) {
                const extras = await this.getChilds(item.id, undefined, req);
                accumulator.push(...extras);
            }

            if (item.parentId === null) return item;
            const parentItem = await groupType._find(item.parentId, this.id);
            if (parentItem) {
                accumulator.push(parentItem);
                return buildTreeUpwards(parentItem, hasExtras);
            }
            return item;
        };

        let foundItems: Item[] = [];

        // Handle all search
        for (const itemType of this.itemTypes) {
            const items = (await itemType.search(s, this.id)).map(a => ({ ...a, marked: true }));
            foundItems = foundItems.concat(items);
        }


        for (const item of foundItems) {
            if (item.parentId !== null) { // changed from 0 to null
                await buildTreeUpwards(item, hasExtras);
            }
        }

        // finalize
        const itemsMap = new Map<string | number, Item>();
        // Add accumulated items to the map
        for (const item of accumulator) {
            itemsMap.set(item.id, item);
        }

        // Overwrite found items
        for (const item of foundItems) {
            itemsMap.set(item.id, item);
        }

        // Convert the map to an array of root items
        const rootItems = Array.from(itemsMap.values());
        return rootItems as T[];
    }


    public static buildTree(items: Item[]): Item[] {
        const tree: Item[] = [];
        const itemMap: { [key: string]: Item } = {};

        items.forEach(item => {
            item.childs = [];
            itemMap[item.id] = item;
        });

        items.forEach(item => {
            if (item.parentId === null) {
                tree.push(item);
            } else {
                const parent = itemMap[item.parentId];
                if (parent) {
                    parent.childs.push(item);
                }
            }
        });

        return tree;
    }
}
