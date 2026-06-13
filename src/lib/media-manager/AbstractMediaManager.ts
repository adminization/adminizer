import type {MediaManagerMetaAP} from "../../models/MediaManagerMetaAP";
import {Adminizer} from "../Adminizer";

export interface MediaManagerItem {
    id?: string;
    parent: string | null;
    variants?: MediaManagerItem[];
    // TODO: create versions realization
    // version?: null
    mimeType: string;
    path: string;
    size: number;
    /**
     * size: lm | sm | any or locale: en | de | fr
     */
    tag: string;
    group?: string;
    url: string;
    filename: string;
    meta?: MediaManagerMetaAP[];
    createdAt?: number;
    updatedAt?: number;
}


type NumericKeys<T> = {
    [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

export type SortCriteria = `${NumericKeys<MediaManagerItem>} ${"ASC" | "DESC"}`;

export interface MediaManagerWidgetItem {
    id: string;
}

/**
 * This method is for receiving data in the client
 */
export interface MediaManagerWidgetClientItem extends MediaManagerWidgetItem {
    /**
     * need only mimeGroup like Imeage/xxx
     */
    mimeType: string;
    variants: MediaManagerItem[];
    filename: string;
    url?: string;
}


export interface MediaManagerWidgetJSON {
    mediaManagerId: string;
    model: string,
    widgetName: string
    modelId: string | number
}

export interface MediaManagerWidgetData {
    id: string;
}

export type UploaderFile = Express.Multer.File;

export interface imageSizes {
    [key: string]: {
        width: number;
        height: number;
    };
}

export type MediaFileType =
    | "application"
    | "audio"
    | "example"
    | "image"
    | "message"
    | "model"
    | "multipart"
    | "text"
    | "video";

export abstract class File<T extends MediaManagerItem> {
    public abstract type: MediaFileType;
    public urlPathPrefix: string;
    public fileStoragePath: string;
    public model: string;
    public metaModel: string;


    /**
     *
     * @param urlPathPrefix
     * @param fileStoragePath
     */
    protected constructor(urlPathPrefix: string, fileStoragePath: string) {
        this.urlPathPrefix = urlPathPrefix;
        this.fileStoragePath = fileStoragePath;
    }

    /**
     * Upload a file.
     * @param file
     * @param filename
     * @param origFileName
     * @param group
     */
    public abstract upload(file: UploaderFile, filename: string, origFileName: string, group?: string): Promise<T[]>;

    /**
     * Get metadata for an item.
     * @param id
     */
    public abstract getMeta(id: string,): Promise<{ key: string; value: string }[]>;

    /**
     * Set metadata for an item.
     * @param id
     * @param data
     */
    public abstract setMeta(id: string, data: { [key: string]: string }): Promise<void>;

    /**
     * Get children of an item.
     * @param id
     */
    public abstract getVariants(id: string): Promise<MediaManagerItem[]>;

    /**
     * Upload cropped image.
     * @param item
     * @param file
     * @param fileName
     * @param group
     * @param localeId
     */
    public abstract uploadVariant(item: MediaManagerItem, file: UploaderFile, fileName: string, group?: string, localeId?: string): Promise<MediaManagerItem>;

    /**
     * Delete an item.
     * @param id
     */
    public abstract delete(id: string): Promise<boolean>;

    /**
     * Get all items of a type.
     * @param limit
     * @param skip
     * @param sort
     * @param group
     */
    public abstract getItems(limit: number, skip: number, sort: SortCriteria, group?: string): Promise<{
        data: MediaManagerItem[];
        next: boolean
    }>;

    public abstract search(s: string, group?: string): Promise<MediaManagerItem[]>;

    public abstract getOrigin(id: string): Promise<string>;

    public abstract getFile(id: number | string): Promise<MediaManagerItem>
}

/**
 *
 * ░█████╗░██████╗░░██████╗████████╗██████╗░░█████╗░░█████╗░████████╗
 * ██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝
 * ███████║██████╦╝╚█████╗░░░░██║░░░██████╔╝███████║██║░░╚═╝░░░██║░░░
 * ██╔══██║██╔══██╗░╚═══██╗░░░██║░░░██╔══██╗██╔══██║██║░░██╗░░░██║░░░
 * ██║░░██║██████╦╝██████╔╝░░░██║░░░██║░░██║██║░░██║╚█████╔╝░░░██║░░░
 * ╚═╝░░╚═╝╚═════╝░╚═════╝░░░░╚═╝░░░╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░░░░╚═╝░░░
 *
 * ███╗░░░███╗███████╗██████╗░██╗░█████╗░███╗░░░███╗░█████╗░███╗░░██╗░█████╗░░██████╗░███████╗██████╗░
 * ████╗░████║██╔════╝██╔══██╗██║██╔══██╗████╗░████║██╔══██╗████╗░██║██╔══██╗██╔════╝░██╔════╝██╔══██╗
 * ██╔████╔██║█████╗░░██║░░██║██║███████║██╔████╔██║███████║██╔██╗██║███████║██║░░██╗░█████╗░░██████╔╝
 * ██║╚██╔╝██║██╔══╝░░██║░░██║██║██╔══██║██║╚██╔╝██║██╔══██║██║╚████║██╔══██║██║░░╚██╗██╔══╝░░██╔══██╗
 * ██║░╚═╝░██║███████╗██████╔╝██║██║░░██║██║░╚═╝░██║██║░░██║██║░╚███║██║░░██║╚██████╔╝███████╗██║░░██║
 * ╚═╝░░░░░╚═╝╚══════╝╚═════╝░╚═╝╚═╝░░╚═╝╚═╝░░░░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚═╝
 */
export abstract class AbstractMediaManager {
    public uploadMaxBytes: number;
    public uloadAllowedTypes: string[];
    public fileStoragePath: string
    public urlPathPrefix: string
    /**

     */
    public allowSearch: boolean;
    /**⚠️ above the settings that need to be implemented*/
    ///

    /**
     * id for mediamanager instance
     */
    abstract id: string;

    public readonly itemTypes: File<MediaManagerItem>[] = [];

    /**
     * Registers the media manager access right through the legacy Adminizer API.
     *
     * @deprecated Starting with Adminizer v6, register access rights through
     * `ctx.accessRight(...)` in the app's `setup` method.
     * @param adminizer Adminizer instance used for legacy access-right registration.
     */
    private _bindAccessRight(adminizer: Adminizer) {
        setTimeout(() => {
            adminizer.accessRightsHelper.registerToken({
                id: `mediaManager-${this.id}`,
                name: this.id,
                description: `Access to edit media-manager for ${this.id}`,
                department: "media-manager",
            });
        }, 100);
    }

    /**
     * @deprecated The `adminizer` parameter is deprecated and will be removed in
     * Adminizer v6. Register the media manager through `AppManager` using
     * `ctx.mediaManager(...)`, and register its access right using
     * `ctx.accessRight(...)`.
     * @param adminizer Adminizer instance used by the legacy registration flow.
     */
    protected constructor(adminizer: Adminizer) {
        this._bindAccessRight(adminizer);
    }

    /**
     * Upload an item.
     * @param file
     * @param filename
     * @param origFileName
     * @param group
     */
    public upload(file: UploaderFile, filename: string, origFileName: string, group?: string) {
        const mimeType = file.mimetype;
        const parts = mimeType.split("/");
        const item = this.getItemType(parts[0]);
        if (item) {
            return item.upload(file, filename, origFileName, group);
        } else {
            throw `item not found for \`${parts[0]}\` in ${JSON.stringify(this.itemTypes.map((i) => i.type))}`
        }
    }

    /**
     * Get item type.
     * @param type
     * @protected
     */
    protected getItemType(type: string) {
        return this.itemTypes.find((it) => it.type === type);
    }

    /**
     * Get all items.
     * @param limit
     * @param skip
     * @param group
     * @param sort
     */
    public abstract getAll(limit: number, skip: number, sort: SortCriteria, group?: string): Promise<{
        data: MediaManagerItem[];
        next: boolean
    }>;

    /**
     * Get items of a type.
     * @param type
     * @param limit
     * @param skip
     * @param sort
     * @param group
     */
    public getItems(type: string, limit: number, skip: number, sort: SortCriteria, group?: string): Promise<{
        data: MediaManagerItem[];
        next: boolean
    }> {
        return this.getItemType(type)?.getItems(limit, skip, sort, group);
    }

    /**
     * Save Relations.
     * @param data
     * @param model model in which a mediafile connection was added
     * @param modelId Id in the model in which the mediafile was added
     * @param widgetName
     */
    public abstract setRelations(
        data: MediaManagerWidgetData[],
        /**
         * widget model in which a mediafile connection was added
         */
        model: string,
        /**
         * widget Id in the model in which the mediafile was added
         */
        modelId: number | string,
        widgetName: string
    ): Promise<void>;

    public abstract getRelations(model: string, widgetName: string, modelId: string | number): Promise<MediaManagerWidgetClientItem[]>;

    /**
     * Search all items.
     * If not this.allowSearch = true then it will not come here
     * @param s
     * @param group
     */
    public abstract searchAll(s: string, group?: string): Promise<MediaManagerItem[]>;

    /**
     * Search items by type.
     * @param s
     * @param type
     * @param group
     */
    public searchItems(s: string, type: string, group?: string): Promise<MediaManagerItem[]> {
        return this.getItemType(type)?.search(s, group);
    }

    /**
     * Get children of an item.
     * @param item
     */
    public getVariants(item: MediaManagerItem): Promise<MediaManagerItem[]> {
        const parts = item.mimeType.split("/");
        return this.getItemType(parts[0])?.getVariants(item.id);
    }

    /**
     * Upload cropped image.
     * @param item
     * @param file
     * @param fileName
     * @param group
     * @param localeId
     */
    public uploadVariant(item: MediaManagerItem, file: UploaderFile, fileName: string, group?: string, localeId?: string): Promise<MediaManagerItem> {
        const parts = item.mimeType.split("/");
        return this.getItemType(parts[0])?.uploadVariant(item, file, fileName, group, localeId);
    }

    /**
     * Get metadata of an item.
     * @param item
     */
    public getMeta(item: MediaManagerItem): Promise<{ key: string; value: string }[]> {
        const parts = item.mimeType.split("/");
        return this.getItemType(parts[0])?.getMeta(item.id);
    }

    public getOrigin(id: string) {
        return this.getItemType("image")?.getOrigin(id);
    }

    public getFile(mimeType: string, id: number | string){
        const parts = mimeType.split("/");
        return this.getItemType(parts[0])?.getFile(id);
    }

    /**
     *  Set metadata of an item.
     * @param item
     * @param data
     */
    public setMeta(item: MediaManagerItem, data: { [key: string]: string },): Promise<void> {
        const parts = item.mimeType.split("/");
        return this.getItemType(parts[0])?.setMeta(item.id, data);
    }

    /**
     * Delete an item.
     * @param item
     */
    public delete(item: MediaManagerItem): Promise<boolean> {
        const parts = item.mimeType.split("/");
        return this.getItemType(parts[0])?.delete(item.id);
    }
}
