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
    public getModels(user: User): string[] {
        const models = this.adminizer.modelHandler.all
            .filter(model => !this.excludedModels.has(model.modelname))
            .map(model => model.modelname.toLowerCase());

        const accessModels: string[] = [];
        for (const model of models) {
            const access = this.adminizer.accessRightsHelper.enoughPermissions([
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
        const accessToUsersHistory = this.adminizer.accessRightsHelper.enoughPermissions([
            `users-history-${this.id}`
        ], user);

        if (!accessToUsersHistory) {
            history = history.filter((historyRecord) => {
                return historyRecord.user.id === user.id;
            });
        }

        return history;
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
            const accessModels = this.getModels(user);
            const accessToUsersHistory = this.adminizer.accessRightsHelper.enoughPermissions([
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

            // Grouping records by model for optimization
            const fieldsCache = new Map<string, any>();

            for (const historyRecord of accessHistory) {
                const modelResource = this.findModelResource(historyRecord);
                const modelKey = historyRecord.modelName;

                // We use a cache so as not to create a DataAccessor for each record
                if (!fieldsCache.has(modelKey)) {
                    const dataAccessor = new DataAccessor(this.adminizer, user, modelResource, "edit");
                    let fields = dataAccessor.getFieldsConfig();
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
        const modelResource = this.findModelResource(history);
        const dataAccessor = new DataAccessor(this.adminizer, user, modelResource, "edit");
        let fields = dataAccessor.getFieldsConfig();
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
                const record = await this.internalModel(modelResource.name).findOne({where: {id: historyRecord.modelId}});

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
        const data: T[] = [];
        for (const id of ids) {
            const record = await this.internalModel(model).findOne({where: {id}});
            if (record) {
                data.push(id);
            }
        }
        return data;
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
        const modelResourceName = history.modelName;

        const modelResourceUri = `${this.adminizer.config.routePrefix}/model/${modelResourceName}`;
        const models = this.adminizer.config.models;
        const foundKey = Object.keys(models).find(
            key => key.toLowerCase() === modelResourceName.toLowerCase()
        );

        const modelResource: ModelResource = {
            name: modelResourceName,
            uri: modelResourceUri,
            model: this.adminizer.modelHandler.model.get(history.modelName),
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

            let Model = this.adminizer.modelHandler.model.get(modelName);
            if (!Model) {
                return;
            }

            let list: ModelAnyInstance[];
            try {
                // adding deprecated records array to config for association widget
                Adminizer.log.warn("Warning: executing malicious job trying to add a huge amount of records in field config," +
                    " please rewrite this part of code in the nearest future");
                let modelResource: ModelResource = {
                    name: modelName, config: this.adminizer.config.models[modelName] as ModelConfig,
                    model: Model, uri: `${this.adminizer.config.routePrefix}/model/${modelName}`
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


