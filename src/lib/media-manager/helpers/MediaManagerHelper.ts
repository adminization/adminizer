import {Fields} from "../../../helpers/fieldsHelper";
import {MediaManagerHandler} from "../MediaManagerHandler";
import {
    MediaManagerWidgetData,
    MediaManagerItem,
    MediaManagerWidgetItem,
    MediaManagerWidgetJSON
} from "../AbstractMediaManager"
import {
    BaseFieldConfig,
    MediaManagerOptionsField,
    ModelConfig
} from "../../../interfaces/adminpanelConfig";
import {Adminizer} from "../../Adminizer";
import type {AppRuntime} from "../../app-manager/AdminizerApp";

type PostParams = Record<string, string | number | boolean | object | string[] | number[] | null>;

export function isMediaManagerFieldConfig(fieldConfig: BaseFieldConfig): boolean {
    return fieldConfig.type === 'mediamanager' || fieldConfig.type === 'single-file';
}

export function normalizeMediaManagerWidgetData(
    value: PostParams[string] | undefined,
    prop: string
): MediaManagerWidgetData[] {
    if (value === undefined || value === null || value === "") {
        return [];
    }

    if (typeof value === "string") {
        let parsedValue: unknown;

        try {
            parsedValue = JSON.parse(value);
        } catch (error) {
            throw new Error(`Error assign association-many mediamanager data for ${prop}, ${value}`);
        }

        if (parsedValue === null) {
            return [];
        }

        if (!Array.isArray(parsedValue)) {
            throw new Error(`Error assign association-many mediamanager data for ${prop}, ${value}`);
        }

        return parsedValue as MediaManagerWidgetData[];
    }

    if (Array.isArray(value)) {
        return value as MediaManagerWidgetData[];
    }

    throw new Error(`Error assign association-many mediamanager data for ${prop}, ${JSON.stringify(value)}`);
}

export function detachMediaManagerField(
    reqData: PostParams,
    rawReqData: PostParams,
    prop: string
) {
    rawReqData[prop] = normalizeMediaManagerWidgetData(reqData[prop], prop);
    delete reqData[prop];
}

/**
 * Create a random file name with prefix and type. If prefix is true, the file name will be prefixed with a random string.
 * @param filenameOrig
 * @param type
 * @param prefix
 */
export function randomFileName(filenameOrig: string, type: string, prefix: boolean) {
    // make random string in end of file
    const prefixLength = 8;
    const randomPrefix = prefix ? Math.floor(Math.random() * Math.pow(36, prefixLength)).toString(36) : ''

    return filenameOrig.replace(/\.[^.]+$/, `_${randomPrefix}${type}$&`)
}

/**
 * Save media manager relations to database.
 * @param adminizer
 * @param fields
 * @param reqData
 * @param model
 * @param recordId
 */
export async function saveRelationsMediaManager(adminizer: Adminizer, fields: Fields, reqData: PostParams, model: string, recordId: string | number) {
    for (let prop in reqData) {
        let fieldConfigConfig = fields[prop].config as BaseFieldConfig;
        let options = fieldConfigConfig.options as MediaManagerOptionsField;
        if (isMediaManagerFieldConfig(fieldConfigConfig)) {
            const data = normalizeMediaManagerWidgetData(reqData[prop], prop);
            let mediaManager = adminizer.mediaManagerHandler.get(options?.id ?? 'default')
            await mediaManager.setRelations(data, model, recordId, prop)
        }
    }
}

export function collectMediaManagerHistoryData(fields: Fields, reqData: PostParams): Record<string, MediaManagerWidgetData[]> {
    const data: Record<string, MediaManagerWidgetData[]> = {};

    for (let prop in reqData) {
        const field = fields[prop];
        if (!field) continue;

        const fieldConfigConfig = field.config as BaseFieldConfig;
        if (!isMediaManagerFieldConfig(fieldConfigConfig)) continue;

        data[prop] = normalizeMediaManagerWidgetData(reqData[prop], prop);
    }

    return data;
}

export async function updateCurrentHistoryMediaManagerData(
    adminizer: Adminizer,
    fields: Fields,
    reqData: PostParams,
    model: string,
    recordId: string | number
) {
    if (!adminizer.config.history?.enabled) return;

    const mediaData = collectMediaManagerHistoryData(fields, reqData);
    if (!Object.keys(mediaData).length) return;

    const historyModel = adminizer.modelHandler.internal("history").get("HistoryActions");

    const currentHistory = await historyModel.findOne({
        where: {
            modelId: String(recordId),
            modelName: model.toLowerCase(),
            isCurrent: true
        }
    });

    if (!currentHistory) return;

    await historyModel.update(
        { where: { id: currentHistory.id } },
        { data: { ...(currentHistory.data ?? {}), ...mediaData } }
    );
}

/**
 * Get realtions
 * @param adminizer
 * @param data
 * @param model
 * @param widgetName
 */
export async function getRelationsMediaManager(adminizer: Adminizer, data: MediaManagerWidgetJSON) {
    let mediaManager = adminizer.mediaManagerHandler.get(data.mediaManagerId)
    return await mediaManager.getRelations(data.model, data.widgetName, data.modelId)
}

/**
 * Delate Ralations
 * @param adminizer
 * @param model
 * @param record
 */
export async function deleteRelationsMediaManager(adminizer: Adminizer, model: string, record: {
    [p: string]: string | MediaManagerWidgetItem[]
}[]) {
    let config = adminizer.config.models[model] as ModelConfig
    for (const key of Object.keys(record[0])) {
        let field = config.fields[key] as BaseFieldConfig
        if (field && isMediaManagerFieldConfig(field)) {
            const option = field.options as MediaManagerOptionsField
            let mediaManager = adminizer.mediaManagerHandler.get(option?.id ?? 'default')
            let emptyData: MediaManagerWidgetData[] = []
            await mediaManager.setRelations(emptyData, model, +record[0].id, key)
        }
    }
}

type MediaManagerModelHost = Adminizer | Pick<AppRuntime, "models">;

/**
 * Reload variants through the model adapter so their associations are populated.
 *
 * Supports both the legacy Adminizer path and app-scoped model access.
 */
export async function populateVariants(
    host: MediaManagerModelHost,
    variants: MediaManagerItem[],
    model: string
): Promise<MediaManagerItem[]> {
    const mediaModel = "models" in host
        ? host.models.get<MediaManagerItem>(model)
        : host.modelHandler.internal("media-manager").get<MediaManagerItem>(model);
    const items: MediaManagerItem[] = [];

    for (const variant of variants ?? []) {
        const populated = await mediaModel.findOne({where: {id: variant.id}});
        if (populated) {
            items.push(populated);
        }
    }
    return items;
}

export function getAssociationFieldName(model: any, associationName: string): string {
    const attributes = model.attributes || {};

    if (associationName === "file") {
        if (attributes.file?.type === "association" && attributes.file.via) {
            return attributes.file.via;
        }

        if (attributes.fileId) {
            return "fileId";
        }
    }

    const idField = `${associationName}Id`;
    return attributes[idField] ? idField : associationName;
}
