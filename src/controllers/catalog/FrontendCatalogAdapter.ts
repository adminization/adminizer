import {AbstractCatalog, Item} from "../../lib/catalog/AbstractCatalog";


interface NodeModel<TDataType> {
    text: string;
    droppable: boolean;
    // isExpanded: boolean;
    id: string;
    parent: number;
    data?: TDataType;
    children?: NodeModel<TDataType>[];

    isSelected?: boolean;
    isVisible?: boolean;
    isDraggable?: boolean;
    isSelectable?: boolean;
    path?: number[];
    pathStr?: string;
    level?: number;
    isFirstChild?: boolean;
    isLastChild?: boolean;
}

interface NodeData extends Item {
}

interface obj {
    [key: string]: string;
}

interface RequestData {
    reqNode: NodeModel<NodeData>[];
    reqParent: NodeModel<NodeData>;
    _method: string;
}

export class FrontendCatalog {
    catalog: AbstractCatalog;

    constructor(_catalog: AbstractCatalog) {
        this.catalog = _catalog;
    }

    setId(id: string) {
        this.catalog.setId(id);
    }

    getItemType(type: string) {
        return this.catalog.getItemType(type);
    }

    getAddTemplate(item: any, req: ReqType) {
        return this.catalog.getAddTemplate(item, req);
    }


    getEditTemplate(item: any, id: string | number, req: ReqType, modelId: string | number) {
        return this.catalog.getEditTemplate(item, id, req, modelId)
    }

    getitemTypes() {
        return this.catalog.getitemTypes();
    }

    getLocales(req: ReqType) {

        let obj: obj = {
            "Delete": "",
            "Edit": "",
            "create": "",
            "Search": "",
            "Select Item type": "",
            "Select Items": "",
            "Save": "",
            "No": "",
            "Are you sure?": "",
            "Yes": "",
            "Select Ids": "",
            "OR": "",
            "Open in a new window": "",
            "Visible": "",
            "Clean": "",
            "Performing an action...": "",
            "Action completed": "",
        }
        obj[this.catalog.name] = ""
        for (const actionHandler of this.catalog.actionHandlers) {
            obj[actionHandler.name] = ""
        }

        let messages = obj

        let outMessages: obj = {}
        for (const mess of Object.keys(messages)) {
            outMessages[mess] = req.i18n.__(mess)
        }
        return {
            ...outMessages,
        }
    }

    async getActions(items: NodeModel<any>[], type: string) {
        let arrItems = []
        for (const item of items) {
            if (item.data.id === 0) item.data.id = null;
            arrItems.push(await this.catalog.find(item.data))
        }
        if (type === 'tools') {
            return (await this.catalog.getActions(arrItems))?.filter(e => e.displayTool);
        } else {
            return (await this.catalog.getActions(arrItems))?.filter(e => e.displayContext);
        }
    }

    async handleAction(actionId: string, items: any[], data: any, req: ReqType) {
        let arrItems = []
        for (const item of items) {
            if (item.data.id === 0) item.data.id = null;
            arrItems.push(await this.catalog.find(item.data))
        }
        return this.catalog.handleAction(actionId, arrItems, data, req);
    }

    async getPopUpTemplate(actionId: string, req: ReqType) {
        return this.catalog.getPopUpTemplate(actionId, req);
    }

    async getLink(actionId: string) {
        return this.catalog.getLink(actionId);
    }

    //Below are the methods that require action

    async getCatalog() {
        let rootItems = await this.catalog.getChilds(null);
        return FrontendCatalogUtils.arrayToNode(rootItems, this.catalog.getGroupType().type);
    }

    async createItem(data: any, req: ReqType) {
        if (data.parentId === 0) data.parentId = null;
        return await this.catalog.createItem(data, req);
        // }
    }

    async getChilds(data: any, req: ReqType) {
        data = FrontendCatalogUtils.refinement(data);
        if (!data || data.id === 0 || data.id === undefined) {
            data = { id: null };
        }
        if (data.id === 0) data.id = null;
        return FrontendCatalogUtils.arrayToNode(await this.catalog.getChilds(data.id, undefined, req), this.catalog.getGroupType().type);
    }

    // Moved into actions
    // getCreatedItems(data: any) {
    //   data = VueCatalogUtils.refinement(data);
    //   return this.catalog.getChilds(data.id);
    // }

    async search(s: string, req: ReqType) {
        let searchResult = await this.catalog.search(s, undefined, req);
        return FrontendCatalogUtils.treeToNode(searchResult, this.catalog.getGroupType().type);
    }

    async updateTree(data: RequestData, req: ReqType): Promise<any> {
        let reqParent = data.reqParent;
        if (reqParent.data.id === 0) reqParent.data.id = null;

        // Update all items into parent (for two reason: update parent, updare sorting order)
        let sortCount = 0;
        for (const childNode of reqParent.children) {
            childNode.data.sortOrder = sortCount;
            childNode.data.parentId = reqParent.data.id
            if (childNode.data.id === 0) childNode.data.id = null;
            await this.catalog.updateItem(childNode.data.id, childNode.data.type, childNode.data, req);
            sortCount++;
        }
        return Promise.resolve('ok')
    }


    async updateItem(item: any, modelId: string, data: any, req: ReqType) {
        let normalizedModelId = modelId;
        if (normalizedModelId === '0') normalizedModelId = null;
        return await this.catalog.updateModelItems(normalizedModelId, item.type, data, req);
        // }
    }

    async deleteItem(item: Item, req: ReqType): Promise<{ ok: boolean }> {
        if (item.id === 0) item.id = null;
        // Get all immediate children of the current element
        const children = await this.catalog.getChilds(item.id, undefined, req);

        // Recursively removing all children
        for (const child of children) {
            await this.deleteItem(child, req);
        }

        // After deleting all descendants, delete the element itself
        await this.catalog.deleteItem(item.type, item.id, req);

        return {ok: true};
    }
}

export class FrontendCatalogUtils {
    /**
     * Removes unnecessary data from the front
     */
    public static refinement<T extends NodeModel<any>>(nodeModel: T) {
        return nodeModel.data;
    }

    /**
     * Normalizes data for frontend: replaces null parentId with 0
     */
    public static normalizeForFrontend<T extends Item>(item: T): T {
        if (!item) {
            throw new Error("Cannot normalize empty catalog item for frontend");
        }
        return { ...item, parentId: item.parentId === null ? 0 : item.parentId };
    }

    public static arrayToNode<T extends Item>(items: T[], groupTypeName: string): NodeModel<T>[] {
        return items.map(node => FrontendCatalogUtils.toNode(node, groupTypeName));
    }

    public static toNode<T extends NodeData>(data: T, groupTypeName: string): NodeModel<T> {
        const normalizedData = FrontendCatalogUtils.normalizeForFrontend(data);
        return {
            data: normalizedData,
            droppable: data.type === groupTypeName,
            id: data.id as string,
            text: data.name,
            parent: (data.parentId === null ? 0 : data.parentId as number),
        };
    }

    public static expandTo<T extends NodeData>(frontendCatalogData: NodeModel<T>, theseItemIdsNeedToBeOpened: (string | number)[]): NodeModel<T> {
        function expand(node: NodeModel<T>): void {
            if (theseItemIdsNeedToBeOpened.includes(node.data.id)) {
                // node.isExpanded = true;
            }

            if (node.children) {
                for (const child of node.children) {
                    expand(child);
                }
            }
        }

        theseItemIdsNeedToBeOpened.forEach(id => {
            expand(frontendCatalogData);
        });

        return frontendCatalogData;
    }

    public static treeToNode(tree: Item[], groupTypeName: string): NodeModel<Item>[] {
        function buildNodes(items: Item[]): NodeModel<Item>[] {
            return items.map(item => {
                const node = FrontendCatalogUtils.toNode(item, groupTypeName);
                if (item.childs && item.childs.length > 0) {
                    // Sort the children before building their nodes
                    item.childs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                    node.children = buildNodes(item.childs);
                    // node.isExpanded = !node.droppable;
                }
                return node;
            });
        }

        return buildNodes(tree);
    }
}

