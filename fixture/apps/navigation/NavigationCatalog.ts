import {
    AbstractCatalog,
    AbstractGroup,
    AbstractItem,
    ActionHandler,
    AppRuntime,
    BaseItem,
    Item,
    ModelConfig,
} from "../../../dist";
import {v4 as uuid} from "uuid";
import {NavigationModel} from "./NavigationModel";
import type {NavigationAppConfig} from "./NavigationTypes";

export interface NavItem extends Item {
    urlPath?: string;
    modelId?: string | number;
    targetBlank?: boolean;
    visible?: boolean;
}

export class NavigationStorage {
    protected storageMap: Map<string | number, NavItem> = new Map();
    public readonly ready: Promise<void>;

    constructor(
        private runtime: AppRuntime,
        private id: string,
        private model: string
    ) {
        this.ready = this.initModel();
    }

    private navigationModel() {
        return this.runtime.models.get<NavigationModel>(this.model);
    }

    public async initModel(): Promise<void> {
        const navigation = await this.navigationModel().findOne({where: {label: this.id}});
        if (navigation) {
            await this.populateFromTree(navigation.tree as unknown as any[]);
            return;
        }

        await this.navigationModel().create({
            label: this.id,
            tree: [] as any,
        });
    }

    public getId(): string {
        return this.id;
    }

    public async buildTree(): Promise<any[]> {
        const rootElements = await this.findElementsByParentId(null, null);
        const buildSubTree = async (elements: NavItem[]): Promise<any[]> => {
            const tree = [];
            for (const element of elements) {
                const children = await this.findElementsByParentId(element.id, null);
                tree.push({
                    ...element,
                    children: await buildSubTree(children),
                });
            }
            return tree;
        };

        const tree = await buildSubTree(rootElements);
        const sortTree = (items: any[]) => {
            items.sort((a, b) => a.sortOrder - b.sortOrder);
            for (const item of items) {
                if (item.children) {
                    sortTree(item.children);
                }
            }
        };

        sortTree(tree);
        return tree;
    }

    public async populateFromTree(tree: any[]): Promise<void> {
        const traverseTree = async (node: any): Promise<void> => {
            const {children, ...itemData} = node;
            const item = {
                ...itemData,
                parentId: itemData.parentId === 0 ? null : itemData.parentId,
            } as NavItem;
            await this.setElement(item.id, item, true);

            if (children?.length) {
                for (const child of children) {
                    await traverseTree(child);
                }
            }
        };

        for (const node of tree) {
            await traverseTree(node);
        }
    }

    public async setElement(_id: string | number, item: NavItem, init = false): Promise<NavItem> {
        this.storageMap.set(item.id, item);
        if (!init) {
            await this.saveToDB();
        }
        return this.findElementById(item.id);
    }

    public async removeElementById(id: string | number): Promise<void> {
        this.storageMap.delete(id);
        await this.saveToDB();
    }

    public async findElementById(id: string | number): Promise<NavItem | undefined> {
        return this.storageMap.get(id);
    }

    public async findElementByModelId(modelId: string | number): Promise<NavItem[]> {
        const elements: NavItem[] = [];
        for (const item of this.storageMap.values()) {
            if (item.modelId === modelId) {
                elements.push(item);
            }
        }
        return elements;
    }

    public async saveToDB(): Promise<void> {
        const tree = await this.buildTree();
        await this.navigationModel().update(
            {where: {label: this.id}},
            {tree: tree as any}
        );
    }

    public async findElementsByParentId(parentId: string | number | null, type: string | null): Promise<NavItem[]> {
        const elements: NavItem[] = [];
        const normalizedParentId = parentId === 0 ? null : parentId;
        for (const item of this.storageMap.values()) {
            if (type === null && item.parentId === normalizedParentId) {
                elements.push(item);
                continue;
            }
            if (item.parentId === normalizedParentId && item.type === type) {
                elements.push(item);
            }
        }
        return elements;
    }

    public async search(s: string, type: string): Promise<NavItem[]> {
        const lowerCaseQuery = s.toLowerCase();
        return Array.from(this.storageMap.values()).filter((item) =>
            item.type === type && item.name.toLowerCase().includes(lowerCaseQuery)
        );
    }
}

export class NavigationStorageServices {
    protected storages: NavigationStorage[] = [];

    public add(storage: NavigationStorage): void {
        this.storages.push(storage);
    }

    public get(id: string): NavigationStorage | undefined {
        return this.storages.find((storage) => storage.getId() === id);
    }

    public async ready(): Promise<void> {
        await Promise.all(this.storages.map((storage) => storage.ready));
    }
}

export class NavigationCatalog extends AbstractCatalog {
    readonly name = "Navigation";
    readonly slug = "navigation";
    public readonly icon = "box";
    public readonly actionHandlers: ActionHandler[] = [];
    public idList: string[] = [];
    public storageServices: NavigationStorageServices;

    constructor(private runtime: AppRuntime, config: NavigationAppConfig) {
        const storageServices = new NavigationStorageServices();
        const items: BaseItem<NavItem>[] = config.items.map((configElement) => new NavigationItem(
            runtime,
            configElement.title,
            configElement.model,
            config.model,
            configElement.urlPath as string,
            storageServices
        ));

        items.push(new NavigationGroup(config.groupField, storageServices));
        items.push(new LinkItem(storageServices));

        super(createLegacyCatalogHost(), items);

        this.storageServices = storageServices;
        for (const section of config.sections) {
            this.storageServices.add(new NavigationStorage(runtime, section, config.model));
        }

        this.movingGroupsRootOnly = config.movingGroupsRootOnly;
        this.idList = config.sections ?? [];
    }

    async getIdList(): Promise<string[]> {
        return this.idList;
    }

    async ready(): Promise<void> {
        await this.storageServices.ready();
    }
}

class NavigationItem extends AbstractItem<NavItem> {
    readonly allowedRoot = true;
    readonly icon: string;
    readonly name: string;
    readonly type: string;
    public readonly adminizer = createLegacyCatalogHost();
    public readonly actionHandlers: ActionHandler[] = [];

    constructor(
        private runtime: AppRuntime,
        name: string,
        private model: string,
        private navigationModel: string,
        private urlPath: string,
        storageServices: NavigationStorageServices
    ) {
        super();
        this.name = name;
        this.type = model.toLowerCase();
        const configModel = runtime.config.getModelConfig(model) as ModelConfig;
        this.icon = configModel?.icon ?? "file_present";
        (this as any).storageServices = storageServices;
    }

    private contentModel() {
        return this.runtime.models.get<any>(this.model);
    }

    async create(data: any, catalogId: string): Promise<NavItem> {
        const storage = this.getStorage(catalogId);
        let storageData: NavItem;
        if (data._method === "select") {
            const record = await this.contentModel().findOne({where: {id: data.record}});
            storageData = await this.dataPreparation({
                record,
                parentId: data.parentId,
                targetBlank: data.targetBlank,
                visible: data.visible,
            }, catalogId);
        } else {
            storageData = await this.dataPreparation(data, catalogId);
        }
        return await storage.setElement(data.id, storageData);
    }

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number): Promise<NavItem> {
        const storage = this.getStorage(catalogId);
        const record = data.record;
        const urlPath = this.renderUrlPath(record);
        let parentId = data.parentId ? data.parentId : null;
        if (parentId === 0) parentId = null;

        return {
            id: uuid(),
            modelId: record.id,
            targetBlank: data.targetBlank ?? record.targetBlank,
            visible: data.visible ?? record.visible,
            isNavigation: true,
            name: record.name ?? record.title ?? record.id,
            parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type,
            urlPath,
        } as NavItem;
    }

    async updateModelItems(modelId: string | number, data: any, catalogId: string): Promise<NavItem> {
        const storage = this.getStorage(catalogId);
        const items = await storage.findElementByModelId(modelId);
        const response = [];
        for (const item of items) {
            item.name = data.record.name ?? data.record.title ?? data.record.id;
            item.urlPath = this.renderUrlPath(data.record);
            if (item.id === data.record.treeId) {
                item.targetBlank = data.record.targetBlank;
                item.visible = data.record.visible;
            }
            response.push(await storage.setElement(item.id, item));
        }
        return response[0];
    }

    async update(itemId: string | number, data: any, catalogId: string): Promise<NavItem> {
        return await this.getStorage(catalogId).setElement(itemId, data);
    }

    async deleteItem(itemId: string | number, catalogId: string): Promise<void> {
        await this.getStorage(catalogId).removeElementById(itemId);
    }

    async find(itemId: string | number, catalogId: string): Promise<NavItem> {
        return await this.getStorage(catalogId).findElementById(itemId);
    }

    async getAddTemplate(req: ReqType): Promise<{
        type: string;
        data: {
            items: { id: string; name: string }[];
            model: string;
            labels?: Record<string, string>;
        };
    }> {
        const itemsDB = await this.contentModel().find({});
        const items = itemsDB.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.title ?? item.id,
        }));
        return {
            type: "navigation.model-link",
            data: {
                items,
                model: this.model,
                labels: {
                    selectTitle: `${req.i18n.__("Select")} ${req.i18n.__(this.name + "s")}`,
                    createTitle: `${req.i18n.__("create new")} ${req.i18n.__(this.name + "s")}`,
                    OR: req.i18n.__("OR"),
                    openInNewWindow: req.i18n.__("Open in a new window"),
                    visible: req.i18n.__("Visible"),
                },
            },
        };
    }

    async getChilds(parentId: string | number | null, catalogId: string): Promise<NavItem[]> {
        return await this.getStorage(catalogId).findElementsByParentId(parentId, this.type);
    }

    async getEditTemplate(id: string | number, catalogId: string): Promise<{
        type: string;
        data: { item: NavItem; model: string };
    }> {
        return {
            type: "navigation.model-link",
            data: {
                item: await this.find(id, catalogId),
                model: this.model,
            },
        };
    }

    async search(s: string, catalogId: string): Promise<NavItem[]> {
        return await this.getStorage(catalogId).search(s, this.type);
    }

    private getStorage(catalogId: string): NavigationStorage {
        const storage = ((this as any).storageServices as NavigationStorageServices).get(catalogId);
        if (!storage) {
            throw new Error(`Navigation storage "${catalogId}" was not found`);
        }
        return storage;
    }

    private renderUrlPath(record: any): string {
        return this.urlPath.replace(/\$\{data\.record\.([^}]+)\}/g, (_match, field) =>
            encodeURIComponent(record?.[field] ?? "")
        );
    }
}

class NavigationGroup extends AbstractGroup<NavItem> {
    readonly allowedRoot = true;
    readonly name: string = "Group";
    readonly groupField: object[];
    public readonly adminizer = createLegacyCatalogHost();

    constructor(groupField: object[], storageServices: NavigationStorageServices) {
        super();
        this.groupField = groupField;
        (this as any).storageServices = storageServices;
    }

    async create(data: any, catalogId: string): Promise<NavItem> {
        let storageData = await this.dataPreparation(data, catalogId);
        delete data.name;
        delete data.parentId;
        storageData = {...storageData, ...data};
        return await this.getStorage(catalogId).setElement(storageData.id, storageData);
    }

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number): Promise<NavItem> {
        const storage = this.getStorage(catalogId);
        let parentId = data.parentId ? data.parentId : null;
        if (parentId === 0) parentId = null;
        return {
            id: uuid(),
            name: data.name,
            targetBlank: data.targetBlank,
            visible: data.visible,
            isNavigation: true,
            parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type,
        } as NavItem;
    }

    async deleteItem(itemId: string | number, catalogId: string): Promise<void> {
        await this.getStorage(catalogId).removeElementById(itemId);
    }

    async find(itemId: string | number, catalogId: string): Promise<NavItem> {
        return await this.getStorage(catalogId).findElementById(itemId);
    }

    async update(itemId: string | number, data: any, catalogId: string): Promise<NavItem> {
        return await this.getStorage(catalogId).setElement(itemId, data);
    }

    async updateModelItems(modelId: string | number, data: NavItem, catalogId: string): Promise<NavItem> {
        return await this.getStorage(catalogId).setElement(modelId, data);
    }

    getAddTemplate(req: ReqType): Promise<{
        type: string;
        data: {
            items?: { name: string; required: boolean }[] | Record<string, any>[];
            model?: string;
            labels?: Record<string, string>;
        };
    }> {
        const items = this.groupField.map((field: any) => ({
            name: field.name,
            label: field.label,
            required: field.required,
        }));
        return Promise.resolve({
            type: "navigation.group",
            data: {
                items,
                labels: {
                    openInNewWindow: req.i18n.__("Open in a new window"),
                    visible: req.i18n.__("Visible"),
                    title: req.i18n.__("Title"),
                    save: req.i18n.__("Save"),
                },
            },
        });
    }

    async getEditTemplate(id: string | number, catalogId: string, req: ReqType): Promise<{
        type: string;
        data: {
            items?: { name: string; required: boolean }[] | Record<string, any>[];
            item?: NavItem;
            labels?: Record<string, string>;
        };
    }> {
        const items = this.groupField.map((field: any) => ({
            name: field.name,
            label: field.label,
            required: field.required,
        }));
        return {
            type: "navigation.group",
            data: {
                items,
                item: await this.find(id, catalogId),
                labels: {
                    openInNewWindow: req.i18n.__("Open in a new window"),
                    visible: req.i18n.__("Visible"),
                    title: req.i18n.__("Title"),
                    save: req.i18n.__("Save"),
                },
            },
        };
    }

    async getChilds(parentId: string | number | null, catalogId: string): Promise<NavItem[]> {
        return await this.getStorage(catalogId).findElementsByParentId(parentId, this.type);
    }

    async search(s: string, catalogId: string): Promise<NavItem[]> {
        return await this.getStorage(catalogId).search(s, this.type);
    }

    private getStorage(catalogId: string): NavigationStorage {
        const storage = ((this as any).storageServices as NavigationStorageServices).get(catalogId);
        if (!storage) {
            throw new Error(`Navigation storage "${catalogId}" was not found`);
        }
        return storage;
    }
}

class LinkItem extends NavigationGroup {
    readonly allowedRoot = true;
    readonly icon = "insert_link";
    readonly name: string = "Link";
    readonly type = "link";
    readonly isGroup = false;

    constructor(storageServices: NavigationStorageServices) {
        super([], storageServices);
    }

    getAddTemplate(req: ReqType): Promise<{
        type: string;
        data: {
            items?: { name: string; required: boolean; label: string }[];
            labels?: Record<string, string>;
        };
    }> {
        return Promise.resolve({
            type: "navigation.link",
            data: {
                items: [{
                    label: req.i18n.__("Link"),
                    name: "link",
                    required: true,
                }],
                labels: {
                    title: req.i18n.__("Title"),
                    openInNewWindow: req.i18n.__("Open in a new window"),
                    visible: req.i18n.__("Visible"),
                    save: req.i18n.__("Save"),
                },
            },
        });
    }

    async getEditTemplate(id: string | number, catalogId: string, req: ReqType): Promise<{
        type: string;
        data: {
            items?: { name: string; required: boolean; label: string }[];
            item?: NavItem;
            labels?: Record<string, string>;
        };
    }> {
        return {
            type: "navigation.link",
            data: {
                items: [{
                    label: req.i18n.__("Link"),
                    name: "link",
                    required: true,
                }],
                item: await this.find(id, catalogId),
                labels: {
                    openInNewWindow: req.i18n.__("Open in a new window"),
                    visible: req.i18n.__("Visible"),
                    title: req.i18n.__("Title"),
                    save: req.i18n.__("Save"),
                },
            },
        };
    }
}

function createLegacyCatalogHost(): any {
    return {
        accessRightsHelper: {
            registerToken: (): void => undefined,
        },
    };
}
