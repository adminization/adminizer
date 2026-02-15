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
    FieldsForms,
    MediaManagerOptionsField,
    ModelConfig
} from "../../../interfaces/adminpanelConfig";
import {Adminizer} from "../../Adminizer";

type PostParams = Record<string, string | number | boolean | object | string[] | number[] | null>;

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
export async function saveRelationsMediaManager(adminizer: Adminizer, fields: Fields, reqData: PostParams, model: string, recordId: number) {
    for (let prop in reqData) {
        let fieldConfigConfig = fields[prop].config as BaseFieldConfig;
        let options = fieldConfigConfig.options as MediaManagerOptionsField;
        if (fieldConfigConfig.type === 'mediamanager') {
            let data = reqData[prop] as MediaManagerWidgetData[];
            let mediaManager = adminizer.mediaManagerHandler.get(options?.id ?? 'default')
            await mediaManager.setRelations(data, model, recordId, prop)
        }
    }
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
        if (field && field.type === 'mediamanager') {
            const option = field.options as MediaManagerOptionsField
            let mediaManager = adminizer.mediaManagerHandler.get(option?.id ?? 'default')
            let emptyData: MediaManagerWidgetData[] = []
            await mediaManager.setRelations(emptyData, model, +record[0].id, key)
        }
    }
}

/**
 * @param adminizer
 * @param variants
 * @param model
 */
export async function populateVariants(adminizer: Adminizer, variants: MediaManagerItem[], model: string): Promise<MediaManagerItem[]> {
    let items: MediaManagerItem[] = []
    for (let variant of variants) {
        // TODO refactor CRUD functions for DataAccessor usage
        variant = await adminizer.modelHandler.model.get(model)["_findOne"]({where: {id: variant.id}})
        items.push(variant)
    }
    return items;
}


export function getAssociationFieldName(model: any, associationName: string): string {
    const attributes = model.attributes || {};

    // For your case: file connection uses fileId
    if (associationName === 'file') {
        // We check whether there is a file connection and what via it has
        if (attributes.file?.type === 'association' && attributes.file.via) {
            return attributes.file.via; // Returns 'fileId'
        }

        // Or just check for the presence of fileId
        if (attributes.fileId) {
            return 'fileId';
        }
    }

    // General case
    const idField = `${associationName}Id`;
    return attributes[idField] ? idField : associationName;
}