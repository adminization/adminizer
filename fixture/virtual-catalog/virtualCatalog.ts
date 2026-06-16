import {
    AbstractCatalog,
    AbstractGroup,
    AbstractItem,
    ActionHandler,
    Item
} from "../../dist";
import {Adminizer} from "../../dist";
import path from "path";
import {v4 as uuid} from "uuid";

interface TestItem extends Item {
    modelId?: string
}

class TestCatalogStorageService {
    protected storageMap: Map<string | number, TestItem> = new Map();
    protected model: string
    protected readonly adminizer: Adminizer

    constructor(adminizer: Adminizer, model: string) {
        this.adminizer = adminizer;
        this.model = model.toLowerCase()
        this.initModel()
    }

    protected async initModel() {
        const model = await this.adminizer.modelHandler
            .internal("test-catalog")
            .get(this.model)
            .findOne({});
        
        if (model) {
            Adminizer.log.info(`Found existing text catalog model`);
            await this.populateFromTree(model.tree);
        } else {
            const tree = {tree: [] as any};
            await this.adminizer.modelHandler
                .internal("test-catalog")
                .get(this.model)
                .create(tree);
            Adminizer.log.info(`Created a new test catalog model`);
        }
    }

    public async buildTree(): Promise<any> {
        const rootElements: TestItem[] = await this.findElementsByParentId(null, null);
        const buildSubTree = async (elements: TestItem[]): Promise<any[]> => {
            const tree = [];
            for (const element of elements) {
                const children = await this.findElementsByParentId(element.id, null);
                tree.push({
                    ...element,
                    children: await buildSubTree(children)
                });
            }
            return tree;
        };

        let tree = await buildSubTree(rootElements);

        function sortTree(items: any[]) {
            items.sort((a, b) => a.sortOrder - b.sortOrder);

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.children) {
                    sortTree(item.children);
                }
            }
        }

        sortTree(tree)
        return tree
    }

    public async populateFromTree(tree: any[]): Promise<void> {
        const traverseTree = async (node: any, parentId: string | number | null = null): Promise<void> => {
            const {children, ...itemData} = node;
            const item = {...itemData, parentId} as TestItem;
            await this.setElement(item.id, item, true);

            if (children && children.length > 0) {
                for (const child of children) {
                    await traverseTree(child, item.id);
                }
            }
        };

        for (const node of tree) {
            await traverseTree(node);
        }
    }

    public async setElement(id: string | number, item: TestItem, init: boolean = false): Promise<TestItem> {
        this.storageMap.set(item.id, item);
        if (!init) await this.saveToDB()
        // This like fetch in DB
        return this.findElementById(item.id);
    }

    public async removeElementById(id: string | number): Promise<void> {
        this.storageMap.delete(id);
        setTimeout(async () => {
            await this.saveToDB()
        }, 500)

    }

    public async findElementById(id: string | number): Promise<TestItem | undefined> {
        return this.storageMap.get(id);
    }

    public async findElementByModelId(modelId: string | number): Promise<TestItem[] | undefined> {
        const elements: TestItem[] = [];
        for (const item of this.storageMap.values()) {
            if (item.modelId === modelId) {
                elements.push(item)
            }
        }
        return elements;
    }

    public async saveToDB() {
        let tree = await this.buildTree()
        try {
            await this.adminizer.modelHandler
                .internal("test-catalog")
                .get(this.model)
                .updateOne({}, {tree: tree})
        } catch (e) {
            console.log(e)
            throw 'test catalog model update error'
        }
    }

    public async findElementsByParentId(parentId: string | number, type: string | null): Promise<TestItem[]> {
        const elements: TestItem[] = [];
        for (const item of this.storageMap.values()) {
            if (type === null && item.parentId === parentId) {
                elements.push(item);
                continue;
            }
            if (item.parentId === parentId && item.type === type) {
                elements.push(item);
            }
        }
        return elements;
    }

    public async getAllElements(): Promise<TestItem[]> {
        return Array.from(this.storageMap.values());
    }

    public async search(s: string, type: string): Promise<TestItem[]> {
        const lowerCaseQuery = s.toLowerCase(); // Convert query to lowercase for case-insensitive search
        const matchedElements: TestItem[] = [];

        for (const item of this.storageMap.values()) {
            // Check if item type matches the specified type
            if (item.type === type) {
                // Search by name
                if (item.name.toLowerCase().includes(lowerCaseQuery)) {
                    matchedElements.push(item);
                }
            }
        }

        return matchedElements;
    }
}

class StorageHandler {
    private static instance: TestCatalogStorageService = null

    private constructor() {
    }

    public static setStorage(storage: TestCatalogStorageService): void {
        this.instance = storage;
    }

    public static getStorage(): TestCatalogStorageService {
        return this.instance;
    }
}

export class TestCatalog extends AbstractCatalog {
    readonly name: string = 'Test Catalog';
    readonly slug: string = 'test-catalog';
    public readonly icon: string = "bug_report";
    public readonly actionHandlers: ActionHandler[] = []
    public idList: string[] = ['default']

    async getIdList(): Promise<string[]> {
        return this.idList;
    }

    constructor(adminizer: Adminizer, model: string) {
        // TODO Adminizer v6: register catalogs through AppManager (`ctx.catalog(...)`).
        // This legacy fixture receives `adminizer` only to bridge assets and access rights until that migration.
        const groupComponentUrl = adminizer.assetHandler.register("virtual-catalog", {
            id: "group",
            filePath: path.resolve(import.meta.dirname, "Group.es.js"),
            devUrl: "/fixture/virtual-catalog/group.tsx",
        });
        const actionComponentUrl = adminizer.assetHandler.register("virtual-catalog", {
            id: "catalog-action",
            filePath: path.resolve(import.meta.dirname, "catalogAction.es.js"),
            devUrl: "/fixture/virtual-catalog/action.tsx",
        });
        let storage = new TestCatalogStorageService(adminizer, model);
        StorageHandler.setStorage(storage);
        let items = []
        items.push(new TestGroup(adminizer, groupComponentUrl))
        items.push(new TestItemM(adminizer))
        items.push(new TestItemModel(adminizer))
        super(adminizer, items);
        adminizer.catalogTemplateComponentHandler.register("virtual-catalog", this.slug, {
            id: "group-template",
            type: "component",
            component: groupComponentUrl,
        });
        this.addActionHandler(new Link())
        this.addActionHandler(new ContextAction())
        this.addActionHandler(new ExternalAction(actionComponentUrl))
    }
}

export class TestGroup extends AbstractGroup<TestItem> {
    adminizer: Adminizer
    name: string = "Group (custom view)";
    allowedRoot: boolean = true;
    actionHandlers: ActionHandler[] = []

    constructor(adminizer: Adminizer, private componentUrl: string) {
        super();
        this.adminizer = adminizer;
    }

    async find(itemId: string | number, catalogId: string, req?: ReqType): Promise<TestItem> {
        return await StorageHandler.getStorage().findElementById(itemId);
    }

    async update(itemId: string | number, data: TestItem, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        return await storage.setElement(itemId, data);
    }

    async updateModelItems(modelId: string | number, data: any, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        return await storage.setElement(modelId, data);
    }

    async create(data: any, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()

        let storageData = await this.dataPreparation(data, catalogId)
        delete data.name
        delete data.parentId
        storageData = {...storageData, ...data}

        return await storage.setElement(storageData.id, storageData) as TestItem;
    }

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number) {
        let storage = StorageHandler.getStorage()
        let parentId = data.parentId ? data.parentId : null; // changed from 0 to null
        return {
            id: uuid(),
            name: data.title,
            parentId: parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type
        };
    }

    async deleteItem(itemId: string | number, catalogId: string, req?: ReqType): Promise<void> {
        let storage = StorageHandler.getStorage()
        return await storage.removeElementById(itemId);
    }

    getAddTemplate(req: ReqType): Promise<{
        type: string;
        data: any;
    }> {
        let type: 'component' = 'component';

        return Promise.resolve({
            type: type,
            data: {
                path: this.componentUrl
            }
        })
    }

    async getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{
        type: string;
        data: any;
    }> {
        let type: 'component' = 'component';
        let item = await this.find(id, '')
        return Promise.resolve({
            type: type,
            data: {
                item: item,
                path: this.componentUrl
            }
        })
    }

    async getChilds(parentId: string | number, catalogId: string, req?: ReqType): Promise<TestItem[]> {
        return await StorageHandler.getStorage().findElementsByParentId(parentId, this.type);
    }

    async search(s: string, catalogId: string, req?: ReqType): Promise<TestItem[]> {
        let storage = StorageHandler.getStorage()
        return await storage.search(s, this.type);
    }
}

class TestItemM extends AbstractItem<TestItem> {
    type: string = 'model.link';
    model: string = 'category';
    adminizer: Adminizer;
    name: string = 'Category model link';
    allowedRoot: boolean = true;
    icon: string = 'file_present';

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
    }

    async find(itemId: string | number, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        return await storage.findElementById(itemId);
    }

    async update(itemId: string | number, data: TestItem, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        return await storage.setElement(itemId, data);
    }

    async updateModelItems(modelId: string | number, data: any, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        let items = await storage.findElementByModelId(modelId)
        let response = []
        for (const item of items) {
            item.name = data.record.name ?? data.record.title ?? data.record.id
            response.push(await storage.setElement(item.id, item));
        }
        return response[0]
    }

    async create(data: any, catalogId: string): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        let storageData = null
        if (data._method === 'select') {
            let record = await this.adminizer.modelHandler
                .internal("test-catalog")
                .get(this.model)
                .findOne({where: {id: data.record}})
            storageData = await this.dataPreparation({
                record: record,
                parentId: data.parentId,
            }, catalogId)
        } else {
            storageData = await this.dataPreparation(data, catalogId)
        }
        return await storage.setElement(data.id, storageData) as TestItem;
    }

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number) {
        let storage = StorageHandler.getStorage()
        let parentId = data.parentId ? data.parentId : null; // changed from 0 to null
        return {
            id: uuid(),
            modelId: data.record.id,
            name: data.record.title,
            parentId: parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type,
        };
    }

    async deleteItem(itemId: string | number, catalogId: string, req?: ReqType): Promise<void> {
        let storage = StorageHandler.getStorage()
        return await storage.removeElementById(itemId);
    }

    async getAddTemplate(req: ReqType): Promise<{
        type: string,
        data: {
            items: { id: string; name: string }[],
            model: string,
            labels?: Record<string, string>,
        }
    }> {
        let type: 'model.link' = 'model.link'
        let itemsDB = await this.adminizer.modelHandler
            .internal("test-catalog")
            .get(this.model)
            .find({})
        let items = itemsDB.map((item: any) => {
            return {
                id: item.id,
                name: item.name ?? item.title ?? item.id
            }
        })
        return {
            type: type,
            data: {
                items: items,
                model: this.model,
                labels: {
                    selectTitle: `${req.i18n.__('Select')} ${req.i18n.__(this.name + 's')}`,
                    createTitle: `${req.i18n.__('create new')} ${req.i18n.__(this.name + 's')}`,
                    OR: req.i18n.__('OR'),
                }
            }
        }
    }

    async getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId: string | number): Promise<{
        type: string,
        data: {
            item: TestItem
        }
    }> {
        return Promise.resolve({
            type: 'model.link',
            data: {
                item: await this.find(id, catalogId),
                model: this.model
            }
        })
    }

    async getChilds(parentId: string | number, catalogId: string, req?: ReqType): Promise<TestItem[]> {
        let storage = StorageHandler.getStorage()
        return await storage.findElementsByParentId(parentId, this.type);
    }

    async search(s: string, catalogId: string, req?: ReqType): Promise<TestItem[]> {
        let storage = StorageHandler.getStorage()
        return await storage.search(s, this.type);
    }

}

class TestItemModel extends AbstractItem<TestItem> {
    type: string = 'model';
    model: string = 'test';
    adminizer: Adminizer;
    name: string = 'Direct Item Model';
    allowedRoot: boolean = true;
    icon: string = 'file_present';

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
    }

    async find(itemId: string | number, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        return await storage.findElementById(itemId);
    }

    async update(itemId: string | number, data: TestItem, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        return await storage.setElement(itemId, data);
    }

    async updateModelItems(modelId: string | number, data: any, catalogId: string, req?: ReqType): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        let items = await storage.findElementByModelId(modelId)
        let response = []
        for (const item of items) {
            item.name = data.record.name ?? data.record.title ?? data.record.id
            response.push(await storage.setElement(item.id, item));
        }
        return response[0]
    }

    async create(data: any, catalogId: string): Promise<TestItem> {
        let storage = StorageHandler.getStorage()
        let storageData = await this.dataPreparation(data, catalogId)
        return await storage.setElement(data.id, storageData) as TestItem;
    }

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number) {
        let storage = StorageHandler.getStorage()
        let parentId = data.parentId ? data.parentId : null;
        return {
            id: uuid(),
            modelId: data.record.id,
            name: data.record.title,
            parentId: parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type,
        };
    }

    async deleteItem(itemId: string | number, catalogId: string, req?: ReqType): Promise<void> {
        let storage = StorageHandler.getStorage()
        return await storage.removeElementById(itemId);
    }

    async getAddTemplate(req: ReqType): Promise<{
        type: 'model',
        data: {
            model: string
        }
    }> {
        return {
            type: 'model',
            data: {
                model: this.model
            }
        }
    }

    async getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId: string | number): Promise<{
        type: 'model',
        data: {
            item: TestItem,
            model: string
        }
    }> {
        return Promise.resolve({
            type: 'model',
            data: {
                item: await this.find(id, catalogId),
                model: this.model
            }
        })
    }

    async getChilds(parentId: string | number, catalogId: string, req?: ReqType): Promise<TestItem[]> {
        let storage = StorageHandler.getStorage()
        return await storage.findElementsByParentId(parentId, this.type);
    }

    async search(s: string, catalogId: string, req?: ReqType): Promise<TestItem[]> {
        let storage = StorageHandler.getStorage()
        return await storage.search(s, this.type);
    }

}

export class Link extends ActionHandler {
    readonly icon: "basic" | "external" | "link" = 'link';
    readonly id: string = 'download';
    readonly name: string = 'Link';
    public readonly displayTool: boolean = true
    public readonly displayContext: boolean = false
    public readonly type = 'link'
    public readonly selectedItemTypes: string[] = []

    getPopUpTemplate(data?: any): Promise<string> {
        return Promise.resolve("");
    }

    getLink(data?: any): Promise<string> {
        return Promise.resolve('https://www.example.com/');
    }

    handler(items: Item[], data?: any, req?: ReqType): Promise<void> {
        return Promise.resolve(undefined);
    }

}

export class ContextAction extends ActionHandler {
    type: "basic" | "external" | "link" = 'basic';
    icon: string = 'drive_file_rename_outline';
    displayContext: boolean = true;
    displayTool: boolean = false;
    id: string = 'context1';
    name: string = 'Context Action';
    public readonly selectedItemTypes: string[] = [
        'group'
    ]

    getPopUpTemplate(data?: any): Promise<string> {
        return Promise.resolve("");
    }

    getLink(data?: any): Promise<string> {
        return Promise.resolve("");
    }

    handler(items: Item[], data?: any, req?: ReqType): Promise<void | string> {
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    console.log('Processing items:', items, 'data: ', data);
                    // some logic here
                    resolve();
                } catch (error) {
                    console.error('Error in handler:', error);
                    resolve();
                }
            }, 5000);
        });
    }

}

export class ExternalAction extends ActionHandler {
    displayContext: boolean = false;
    type: "link" | "basic" | "external" = 'external';
    displayTool: boolean = true;
    id: string = 'external_action';
    icon: string = 'launch';
    name: string = 'External Action';
    public readonly selectedItemTypes: string[] = []

    constructor(private popupTemplateUrl: string) {
        super();
    }

    getPopUpTemplate(req?: ReqType): Promise<string> {
        return Promise.resolve(this.popupTemplateUrl);
    }

    getLink(data?: any): Promise<string> {
        return Promise.resolve('');
    }

    handler(items: Item[], data?: any, req?: ReqType): Promise<void | string> {
        console.log('HTMLAction handler items: ', items, 'data: ', parseInt(data.number) === 7)
        return new Promise((resolve, reject) => {
            if (parseInt(data.number) === 7) {
                setTimeout(() => {
                    resolve('ok')
                }, 1000)
            } else {
                setTimeout(() => {
                    resolve('error')
                }, 1000)
            }
        })
    }

}
