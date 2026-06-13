import type {MediaManagerItem} from "../../../dist";

export interface MediaManagerMetaRecord {
    id?: string;
    key: string;
    value: unknown;
    isPublic: boolean;
    parentId?: string;
    parent?: MediaManagerItem;
}

export interface MediaManagerAssociationRecord {
    id?: string;
    mediaManagerId: string;
    model: string;
    modelId: string;
    widgetName: string;
    sortOrder: number;
    fileId?: string;
    file?: MediaManagerItem;
}

export interface PublicMediaManagerMeta {
    key: string;
    value: string;
}
