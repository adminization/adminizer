import { HistoryActions } from "../../models/HistoryActions";
import { User } from "../../models/User";
import { Adminizer } from "../Adminizer";
import { Field, Fields } from "../../helpers/fieldsHelper";
import { ActionType, ModelConfig } from "../../interfaces/adminpanelConfig";
import { ModelResource } from "../../interfaces/types";
import { ModelAnyInstance } from "../model/AbstractModel";
import { isObject } from "../../helpers/JsUtils";
import { DataAccessor } from "../DataAccessor";
import { BaseFieldConfig, MediaManagerOptionsField } from "../../interfaces/adminpanelConfig";
import { setAssociationValues } from "../../helpers/inertiaAddHelper";
import {
    isMediaManagerFieldConfig,
    normalizeMediaManagerWidgetData
} from "../media-manager/helpers/MediaManagerHelper";

/**
 * Set of model names excluded from history tracking.
 * These models are internal or administrative and should not appear in user-accessible history.
 */
const EXCLUDED_MODELS = new Set([
    'HistoryActions',
    'MediaManagerAP',
    'MediaManagerAssociationsAP',
    'MediaManagerMetaAP',
    'Notification',
    'UserNotification',
    'User',
    'Group'
]);

/**
 * Abstract base class for handling history operations in the AdminPanel.
 * Provides common methods and structure for retrieving, filtering, and formatting historical data.
 * Subclasses must implement model-specific logic for persistence and retrieval.
 *
 * @abstract
 */
export abstract class AbstractHistoryAdapter {
    /**
     * Unique identifier for this history adapter instance.
     * Used for access rights registration and identification.
     */
    public abstract id: string;

    /**
     * Reference to the main Adminizer instance.
     * Provides access to models, configuration, access rights, and services.
     */
    protected adminizer: Adminizer;

    /**
    * Set of model names to exclude from history tracking.
    * Includes default internal models and any additional ones from config.
    */
    protected excludedModels: Set<string> = EXCLUDED_MODELS;

    /**
     * Constructs a new history adapter, binds access rights, and extends excluded models from configuration.
     *
     * @param adminizer - The main Adminizer instance.
     */
    protected constructor(adminizer: Adminizer) {
        this._bindAccessRight(adminizer);
        // Add excluded models from config
        if (adminizer.config.history.excludeModels) {
            adminizer.config.history.excludeModels.forEach((model: string) => {
                this.excludedModels.add(model);
            });
        }
    }

    private internalModel<T = any>(modelName: string) {
        return this.adminizer.modelHandler.internal("history").get<T>(modelName);
    }

    /**
     * Record-level access for history rows. A history row names a record (`modelName` +
     * `modelId`), so a user holding the history token could otherwise read diffs and old
     * values of records they cannot reach (`userAccessRelation` or accessGraph) — the
     * model-level filter above does not look at individual records. Resolved in one query
     * per referenced model.
     *
     * A user's own actions always stay visible: a delete removes the very row an access
     * check would have to match, and hiding it would erase the author's own audit trail.
     */
    protected async filterHistoryByRecordAccess(history: HistoryActions[], user: User): Promise<HistoryActions[]> {
        if (!history.length || user.isAdministrator) {
            return history;
        }

        const byModel = new Map<string, HistoryActions[]>();
        for (const historyRecord of history) {
            const bucket = byModel.get(historyRecord.modelName);
            if (bucket) {
                bucket.push(historyRecord);
            } else {
                byModel.set(historyRecord.modelName, [historyRecord]);
            }
        }

        const denied = new Set<HistoryActions>();
        for (const records of byModel.values()) {
            const visibleIds = await this.visibleRecordIds(records, user);
            if (!visibleIds) {
                continue; // the model carries no record access rules — model-level access is enough
            }

            for (const historyRecord of records) {
                const isOwnAction = historyRecord.user && String(historyRecord.user.id) === String(user.id);
                if (!isOwnAction && !visibleIds.has(String(historyRecord.modelId))) {
                    denied.add(historyRecord);
                }
            }
        }

        return denied.size ? history.filter((historyRecord) => !denied.has(historyRecord)) : history;
    }

    /** True when the user may see the record this history row refers to. */
    protected async isHistoryRecordAccessible(historyRecord: HistoryActions, user: User): Promise<boolean> {
        const [allowed] = await this.filterHistoryByRecordAccess([historyRecord], user);
        return Boolean(allowed);
    }

    /**
     * Ids of the referenced records the user actually reaches, or `undefined` when the
     * model has no record access rules at all (then there is nothing to check).
     */
    private async visibleRecordIds(records: HistoryActions[], user: User): Promise<Set<string> | undefined> {
        const modelResource = this.findModelResource(records[0]);
        if (!modelResource.model) {
            // The model is gone, so nothing can be verified — fail closed.
            return new Set();
        }

        let accessWhere: Record<string, unknown>;
        try {
            const dataAccessor = new DataAccessor(this.adminizer, user, modelResource, "view");
            accessWhere = await dataAccessor.getRecordAccessWhere();
        } catch (e) {
            // A misconfigured graph must not open the history up.
            Adminizer.log.error(`History > could not resolve the record access of "${modelResource.name}"`, e);
            return new Set();
        }

        if (!Object.keys(accessWhere).length) {
            return undefined;
        }

        const primaryKey = (modelResource.model.primaryKey ?? "id") as string;
        // History stores ids as strings; the column may well be numeric.
        const isNumericKey = modelResource.model.attributes?.[primaryKey]?.type === "number";
        const ids = Array.from(new Set(records.map((historyRecord) => historyRecord.modelId)))
            .map((id) => (isNumericKey ? Number(id) : id))
            .filter((id) => !(typeof id === "number" && Number.isNaN(id)));

        const rows = await this.internalModel(modelResource.name)
            .find({where: {...accessWhere, [primaryKey]: {in: ids}}});
        return new Set((rows ?? []).map((row: Record<string, unknown>) => String(row[primaryKey])));
    }

    /**
     * Registers access rights for this history adapter.
     * Called during construction with a slight delay to ensure Adminizer is ready.
     *
     * @param adminizer - The Adminizer instance to bind to.
     * @private
     */
    private _bindAccessRight(adminizer: Adminizer) {
        this.adminizer = adminizer;
        setTimeout(() => {
            adminizer.accessRightsHelper.registerTokens([
                {
                    id: `history-${this.id}`,
                    name: this.id,
                    description: `Access to history for ${this.id}`,
                    department: 'History actions',
                },
                {
                    id: `users-history-${this.id}`,
                    name: 'Access to users history',
                    description: `Access to users history for ${this.id}`,
                    department: 'History actions',
                },
            ]);
        }, 100);
    }

    /**
     * Retrieves all history records for a specific model instance.
     *
     * @param modelId - ID of the model instance.
     * @param modelName - Name of the model.
     * @returns Promise resolving to an array of history records.
     */
    public abstract getAllModelHistory(modelId: string | number, modelName: string, user: User): Promise<HistoryActions[]>;

    /**
     * Retrieves all accessible history records for a user.
     *
     * @param user - User requesting the data.
     * @param modelName - Optional model name to filter results.
     * @returns Promise resolving to a record of history data.
     */
    public abstract getAllHistory(user: User, forUserName: string, modelName: string, limit?: number, offset?: number, from?: Date, to?: Date): Promise<{ data: HistoryActions[] }>;

    /**
     * Saves a new history record.
     *
     * @param data - History data excluding auto-generated fields (`id`, `createdAt`, `updatedAt`, `isCurrent`).
     * @returns Promise resolving when the record is saved.
     */
    public abstract setHistory(data: Omit<HistoryActions, "id" | "createdAt" | "updatedAt" | "isCurrent" | "user"> & { user: string | number }): Promise<void>;

    /**
     * Retrieves detailed history data for a specific history record.
     * Processes field values based on their type (e.g., media manager, associations).
     *
     * @param historyId - ID of the history record.
     * @param user - User requesting the data (used for access control).
     * @returns Promise resolving to formatted history data.
     */
    public abstract getModelFieldsHistory(historyId: number, user: User): Promise<Record<string, any>>;

    /**
     * Gets a list of models for which the user has update permissions.
     * Excludes internal models defined in `excludedModels`.
     *
     * @param user - User whose permissions are checked.
     * @returns Array of model names (in lowercase) the user can access.
     */
    public async getModels(user: User): Promise<string[]> {
        const models = Array.from(this.adminizer.modelHandler.model.entries())
            .filter(([, model]) => !this.excludedModels.has(model.modelname))
            .map(([resourceName]) => resourceName);

        const accessModels: string[] = [];
        for (const model of models) {
            const access = await this.adminizer.accessRightsHelper.checkAnyPermission([
                `read-${model}-model`,
            ], user);
            if (access) accessModels.push(model);
        }

        return accessModels;
    }

    /**
    * Filters history records based on user access rights.
    * If the user lacks "users-history" permission, only their own records are returned.
    *
    * @param history - Array of raw history records.
    * @param user - The user requesting the data.
    * @returns A promise resolving to filtered history records accessible to the user.
    * @protected
    */
    protected async _getAllModelHistory(history: HistoryActions[], user: User): Promise<HistoryActions[]> {
        const accessToUsersHistory = await this.adminizer.accessRightsHelper.checkAnyPermission([
            `users-history-${this.id}`
        ], user);

        if (!accessToUsersHistory) {
            history = history.filter((historyRecord) => {
                return historyRecord.user.id === user.id;
            });
        }

        return this.filterHistoryByRecordAccess(history, user);
    }


    /**
     * Filters and enhances history records with display names based on model configurations.
     * Ensures only models the user can access are included.
     *
     * @param history - Array of raw history records.
     * @param user - The user requesting the data.
     * @returns A promise resolving to enhanced history records with `displayName` property.
     * @protected
     */
    protected async _getAllHistory(history: HistoryActions[], user: User): Promise<(HistoryActions & { displayName: string })[]> {
        try {
            const accessModels = await this.getModels(user);
            const accessToUsersHistory = await this.adminizer.accessRightsHelper.checkAnyPermission([
                `users-history-${this.id}`
            ], user);

            let accessHistory: HistoryActions[] = [];
                        
            if (!accessToUsersHistory) {
                history = history.filter((historyRecord) => {
                    
                    return historyRecord.user.id === user.id;
                });
            }

            
            for (const historyRecord of history) {
                if (accessModels.includes(historyRecord.modelName)) {
                    accessHistory.push(historyRecord);
                }
            }

            // Model-level access is not enough: drop rows about records the user cannot reach
            accessHistory = await this.filterHistoryByRecordAccess(accessHistory, user);

            // Grouping records by model for optimization
            const fieldsCache = new Map<string, any>();

            for (const historyRecord of accessHistory) {
                const modelResource = this.findModelResource(historyRecord);
                const modelKey = historyRecord.modelName;

                // We use a cache so as not to create a DataAccessor for each record
                if (!fieldsCache.has(modelKey)) {
                    const dataAccessor = new DataAccessor(this.adminizer, user, modelResource, "edit");
                    // No access rights to the model at all: keep the diff empty instead of throwing
                    let fields = dataAccessor.getFieldsConfig() ?? {};
                    fields = await this.loadAssociations(fields, user, "edit");
                    fieldsCache.set(modelKey, fields);
                }

                const fields = fieldsCache.get(modelKey);
                historyRecord.diff = historyRecord.diff.filter((item: any) =>
                    Object.keys(fields).includes(item.field)
                );
            }

            return await this.setModelsDisplayName(accessHistory);

        } catch (e) {
            Adminizer.log.error('Error getting history', e);
            throw new Error("Error getting history");
        }
    }

    /**
     * Formats a single history record for frontend consumption.
     * Processes field types such as media manager, color, and associations.
     *
     * @param history - Raw history record.
     * @param user - User requesting the data.
     * @returns Promise resolving to formatted data object.
     * @protected
     */
    protected async _getModelFieldsHistory(history: HistoryActions, user: User): Promise<Record<string, any>> {
        if (!await this.isHistoryRecordAccessible(history, user)) {
            Adminizer.log.debug(
                `History > record ${history.modelName}#${history.modelId} is out of reach of user "${user.login}"`
            );
            return {};
        }

        const modelResource = this.findModelResource(history);
        const dataAccessor = new DataAccessor(this.adminizer, user, modelResource, "edit");
        // No access rights to the model at all: nothing to format, not a crash
        let fields = dataAccessor.getFieldsConfig() ?? {};
        fields = await this.loadAssociations(fields, user, "edit");

        let data: Record<string, any> = {};
        for (const field of Object.keys(fields)) {
            const fieldConfigConfig = fields[field].config as BaseFieldConfig;
            if (isMediaManagerFieldConfig(fieldConfigConfig)) {
                if (!Object.prototype.hasOwnProperty.call(history.data ?? {}, field)) {
                    continue;
                }

                const mediaManager = this.adminizer.mediaManagerHandler.get((fieldConfigConfig.options as MediaManagerOptionsField)?.id ?? "default");
                data[field] = [];
                const files = normalizeMediaManagerWidgetData(history.data[field], field);

                for (const file of files) {
                    const fileData = file as typeof file & Partial<{ mimeType: string; filename: string; url: string; variants: any[] }>;
                    if (!fileData?.id) continue;

                    try {
                        const media = fileData.mimeType
                            ? await mediaManager.getFile(fileData.mimeType, fileData.id as any)
                            : null;

                        if (!media) {
                            data[field].push(fileData);
                            continue;
                        }

                        data[field].push({
                            id: media.id,
                            mimeType: media.mimeType,
                            filename: media.filename,
                            url: media.url,
                            variants: []
                        });
                    } catch (_e) {
                        data[field].push(fileData);
                    }
                }

            } else if (fieldConfigConfig.type === 'color') {
                data[field] = history.data[field] ? history.data[field] : '#000000';
            } else if (fieldConfigConfig.type === 'association' || fieldConfigConfig.type === 'association-many') {
                const { initValue } = setAssociationValues(fields[field], history.data[field]);
                data[field] = await this.getModelRelationsHistory(fields[field].model.model ?? fields[field].model.collection, initValue);
            } else {
                data[field] = history.data[field];
            }
        }

        return data;
    }

    /**
    * Enhances history records with a human-readable display name based on model configuration.
    * Falls back to model ID if display name cannot be determined.
    *
    * @param history - The history records to enhance.
    * @returns A promise resolving to an array of records with `displayName` property.
    * @protected
    */
    protected async setModelsDisplayName(history: HistoryActions[]): Promise<(HistoryActions & { displayName: string })[]> {
        const modifiedHistory: (HistoryActions & { displayName: string })[] = [];
        // One lookup per referenced model instead of one per history row
        const referencedRecords = await this.loadReferencedRecords(history);

        for (const historyRecord of history) {
            const modelResource = this.findModelResource(historyRecord);
            const { displayName } = modelResource.config;

            if (!displayName) {
                modifiedHistory.push({
                    ...historyRecord,
                    displayName: historyRecord.modelId.toString(),
                });
                continue;
            }

            try {
                const record: any = referencedRecords.get(this.referenceKey(historyRecord)) ?? null;

                let displayValue: string;

                if (typeof displayName === 'string') {
                    displayValue = record ? (record[displayName] ?? historyRecord.modelId.toString()) : historyRecord.modelId.toString();
                } else if (typeof displayName === 'function') {
                    const result = displayName(record);
                    displayValue = typeof result === 'string' ? result : historyRecord.modelId.toString();
                } else {
                    displayValue = historyRecord.modelId.toString();
                }

                modifiedHistory.push({
                    ...historyRecord,
                    displayName: displayValue,
                });
            } catch (error) {
                modifiedHistory.push({
                    ...historyRecord,
                    displayName: historyRecord.modelId.toString(),
                });
            }
        }

        return modifiedHistory;
    }

    /** `modelName#modelId` — the identity of the record a history row refers to. */
    private referenceKey(historyRecord: HistoryActions): string {
        return `${historyRecord.modelName}#${String(historyRecord.modelId)}`;
    }

    /**
     * Records referenced by the given history rows, fetched with one query per model.
     * Missing rows (deleted records, models that are gone) are simply absent from the map.
     */
    private async loadReferencedRecords(history: HistoryActions[]): Promise<Map<string, Record<string, unknown>>> {
        const idsByModel = new Map<string, Set<unknown>>();
        for (const historyRecord of history) {
            const bucket = idsByModel.get(historyRecord.modelName);
            if (bucket) {
                bucket.add(historyRecord.modelId);
            } else {
                idsByModel.set(historyRecord.modelName, new Set([historyRecord.modelId]));
            }
        }

        const referenced = new Map<string, Record<string, unknown>>();
        for (const [modelName, ids] of idsByModel) {
            const modelResource = this.findModelResource({modelName} as HistoryActions);
            if (!modelResource.model) {
                continue;
            }

            const primaryKey = (modelResource.model.primaryKey ?? "id") as string;
            const isNumericKey = modelResource.model.attributes?.[primaryKey]?.type === "number";
            const values = Array.from(ids)
                .map((id) => (isNumericKey ? Number(id) : id))
                .filter((id) => !(typeof id === "number" && Number.isNaN(id)));

            try {
                const rows = await this.internalModel(modelResource.name).find({where: {[primaryKey]: {in: values}}});
                for (const row of rows ?? []) {
                    referenced.set(`${modelName}#${String(row[primaryKey])}`, row);
                }
            } catch (e) {
                Adminizer.log.error(`History > could not load the records referenced in "${modelName}"`, e);
            }
        }

        return referenced;
    }

    /**
     * Filters related model IDs to only those that exist in the database.
     *
     * @param model - Name of the related model.
     * @param ids - Array of IDs to validate.
     * @returns Promise resolving to array of existing IDs.
     * @protected
     * @template T - Type of the ID (string or number).
     */
    protected async getModelRelationsHistory<T extends string | number>(model: string, ids: T[]): Promise<T[]> {
        if (!ids.length) {
            return [];
        }

        // One query for the whole set; the input order is preserved
        const records = await this.internalModel(model).find({where: {id: {in: ids}}});
        const existing = new Set((records ?? []).map((record: Record<string, unknown>) => String(record.id)));
        return ids.filter((id) => existing.has(String(id)));
    }

    /**
     * Constructs an ModelResource object from a history record.
     * Used to access model configuration and instance.
     *
     * @param history - The history record.
     * @returns ModelResource object with name, URI, model instance, and config.
     * @protected
     */
    protected findModelResource(history: HistoryActions): ModelResource {
        const modelResourceName = this.adminizer.modelHandler.getResourceRecord(history.modelName)?.name
            ?? history.modelName;

        const modelResourceUri = `${this.adminizer.config.routePrefix}/model/${modelResourceName}`;
        const models = this.adminizer.config.models;
        const foundKey = Object.keys(models).find(
            key => key.toLowerCase() === modelResourceName.toLowerCase()
        );

        const modelResource: ModelResource = {
            name: modelResourceName,
            uri: modelResourceUri,
            model: this.adminizer.modelHandler.getResource(modelResourceName),
            config: models[foundKey]
        };
        return modelResource;
    }

    /**
     * Loads associated records for association-type fields.
     * Populates `records` array in field config for widget rendering.
     *
     * @param fields - Fields configuration to process.
     * @param user - User requesting data.
     * @param action - Optional action type (e.g., "view", "edit").
     * @returns Promise resolving to updated fields with loaded associations.
     * @protected
     */
    protected async loadAssociations(fields: Fields, user: User, action?: ActionType): Promise<Fields> {

        let loadAssoc = async (key: string, action?: ActionType) => {
            let fieldConfigConfig = fields[key].config as Field["config"];
            if (!isObject(fieldConfigConfig)) {
                throw 'type error: fieldConfigConfig should be normalized';
            }
            if (fieldConfigConfig.type !== 'association' && fieldConfigConfig.type !== 'association-many') {
                return;
            }
            fieldConfigConfig.records = [];

            let modelName = fields[key].model.model || fields[key].model.collection;

            if (!modelName) {
                Adminizer.log.error('No model found for field: ', fields[key]);
                return;
            }

			const resourceName = this.adminizer.modelHandler.resolveAssociationResource(
				modelName,
				fields[key].model.resourceName
			);
            let Model = resourceName ? this.adminizer.modelHandler.getResource(resourceName) : undefined;
            if (!Model || !resourceName) {
                return;
            }

            let list: ModelAnyInstance[];
            try {
                // adding deprecated records array to config for association widget
                Adminizer.log.warn("Warning: executing malicious job trying to add a huge amount of records in field config," +
                    " please rewrite this part of code in the nearest future");
                let modelResource: ModelResource = {
                    name: resourceName, config: this.adminizer.config.models[resourceName] as ModelConfig,
                    model: Model, uri: `${this.adminizer.config.routePrefix}/model/${resourceName}`
                };
                let dataAccessor = new DataAccessor(this.adminizer, user, modelResource, "view");
                list = await Model.find({}, dataAccessor);
            } catch (e) {
                Adminizer.log.error(e);
                throw new Error("FieldsHelper > loadAssociations error");
            }

            fieldConfigConfig.records = list;
        };

        for await (let key of Object.keys(fields)) {
            try {
                await loadAssoc(key, action);
            } catch (e) {
                Adminizer.log.error(e);
                return e;
            }
        }

        return fields;
    }
}


