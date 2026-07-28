/**
 * The class manages the interaction between the user and the database entry, taking into account user permissions and the main config file settings.
 */
import {ModelResource} from "../interfaces/types";
import {
    ActionType,
    FieldsModels,
    FieldsTypes,
    ModelConfig,
} from "../interfaces/adminpanelConfig";
import {Field, Fields} from "../helpers/fieldsHelper";
import {ControllerHelper} from "../helpers/controllerHelper";
import {Adminizer} from "./Adminizer";
import { Group } from "../models/Group";
import { User } from "../models/User";
import { isObject } from "../helpers/JsUtils";
import { CriteriaSelect, CriteriaWhere, QueryCriteria } from "../interfaces/queryCriteria";

const MODEL_TOKEN_SUFFIX = "model";

function hasCriteriaContent(criteria: CriteriaWhere): boolean {
    return Object.keys(criteria).length > 0 || Object.getOwnPropertySymbols(criteria).length > 0;
}

function isPlainCriteriaWhere(where: unknown): where is CriteriaWhere {
    if (!isObject(where)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(where);
    return prototype === Object.prototype || prototype === null;
}

function mergeCriteriaWhere(criteriaWhere: QueryCriteria["where"], sanitizedCriteria: CriteriaWhere): QueryCriteria["where"] {
    if (!hasCriteriaContent(sanitizedCriteria)) {
        return criteriaWhere;
    }

    if (!criteriaWhere) {
        return sanitizedCriteria;
    }

    if (isPlainCriteriaWhere(criteriaWhere)) {
        return {
            ...criteriaWhere,
            ...sanitizedCriteria
        };
    }

    return {
        and: [
            criteriaWhere as CriteriaWhere,
            sanitizedCriteria
        ]
    };
}

export class DataAccessor {
    public readonly adminizer: Adminizer;
    user: User;
    modelResource: ModelResource;
    action: ActionType
    private fields: Fields = null;
    private actionVerb: string

    constructor(adminizer: Adminizer, user: User, modelResource: ModelResource, action: ActionType) {
        this.adminizer = adminizer;
        this.user = user;
        this.modelResource = modelResource;
        this.action = action
        this.actionVerb = getTokenAction(this.action);

    }

    private getModelConfig(modelName: string): ModelConfig | undefined {
        const resolvedModelName = this.adminizer.modelHandler.resolveModelName(modelName);
        const entry = Object.entries(this.adminizer.config.models)
            .find(([key, config]) => {
                if (key.toLowerCase() === resolvedModelName.toLowerCase()) {
                    return true;
                }

                if (!isObject(config)) {
                    return false;
                }

                return config.model?.toLowerCase() === resolvedModelName.toLowerCase();
            });
        const config = entry ? entry[1] : undefined;
        return isObject(config) ? config as ModelConfig : undefined;
    }

    private accessRelationModel<T = any>(modelName: string) {
        return this.adminizer.modelHandler.internal("data-accessor").get<T>(modelName);
    }

    private resolveRelationTarget(modelName?: string): string | undefined {
        if (!modelName) {
            return undefined;
        }

        return this.adminizer.modelHandler.resolveModelName(modelName).toLowerCase();
    }

    /**
     * Retrieves the fields for the given ModelResource based on action type,
     * taking into account access rights and configuration settings.
     * @returns {Fields} An object with configured fields and their properties.
     */
    public getFieldsConfig(): Fields {
        if (this.fields !== null) {
            return this.fields;
        }

        if (!this.modelResource.model || !this.modelResource.model.attributes) {
            return {};
        }

        // get action and field configs
        const actionConfig = ControllerHelper.findActionConfig(this.modelResource, this.action);
        const fieldsConfig = this.modelResource.config?.fields || {};
        const modelAttributes = this.modelResource.model.attributes;

        const tokenId = `${this.actionVerb}-${this.modelResource.model.modelname}-${MODEL_TOKEN_SUFFIX}`;
        if (!this.adminizer.accessRightsHelper.hasPermission(tokenId, this.user)) {
            Adminizer.log.debug(`getFieldsConfig > No access rights to ${this.actionVerb} model: ${this.modelResource.model.modelname}`);
            return undefined;
        }

        const result: Fields = {};
        Object.entries(modelAttributes).forEach(([key, modelField]) => {
            // The fields that are recorded separately from the connection in some ORMs, because they are processed at the level above them.
            if(modelAttributes[key].primaryKeyForAssociation === true) {
                return undefined
            }
            
            // Supports shorthand model attributes: fieldName: 'string'
            if (typeof modelField === "string") {
                modelField = {type: modelField};
            }

            // Set association type for a field
            if (modelField && typeof modelField === "object") {
                if (modelField.model) {
                    modelField.type = "association";
                }
                if (modelField.collection) {
                    modelField.type = "association-many";
                }
            }

            // Getting base field config
            let fldConfig: Field["config"] = {key: key, title: key};
            let associatedModelConfig: ModelConfig = undefined;

            // Action-specific config has priority over global; objects are merged
            const globalFieldConfig = fieldsConfig[key];
            const actionFieldConfig = actionConfig.fields?.[key];

            if (globalFieldConfig || actionFieldConfig) {
                const rawFieldConfig = { ...globalFieldConfig, ...actionFieldConfig };
                const normalizedFieldConfig = this.adminizer.configHelper.normalizeFieldConfig(this.adminizer, rawFieldConfig, key, modelField);
                if (!normalizedFieldConfig) {
                    return;
                }
                if (!this.checkFieldAccess(key, normalizedFieldConfig)) {
                    return;
                }
                fldConfig = { ...fldConfig, ...normalizedFieldConfig };
            }

            // Populate associated fields configuration if field is an association
            let populatedModelFieldsConfig = {};
            if (modelField.type === "association" || modelField.type === "association-many") {
                const modelName = modelField.model || modelField.collection;
                const resolvedModelName = modelName ? this.adminizer.modelHandler.resolveModelName(modelName) : undefined;

                if (modelName && resolvedModelName) {
                    const tokenId = `read-${resolvedModelName}-${MODEL_TOKEN_SUFFIX}`;
                    if (!this.adminizer.accessRightsHelper.hasPermission(tokenId, this.user)) {
                        Adminizer.log.silly(`No access rights to model: ${this.modelResource.model.modelname}`);
                        return undefined;
                    }

                    const model = this.adminizer.modelHandler.model.get(modelName);
                    if (model) {
                        populatedModelFieldsConfig = this.getAssociatedFieldsConfig(resolvedModelName);
                        const modelCfg = this.getModelConfig(resolvedModelName);
                        if (modelCfg) {
                            associatedModelConfig = modelCfg;
                        } else {
                            Adminizer.log.error(`DataAccessor > getFieldsConfig > Model config not found: ${resolvedModelName}`);
                        }
                    } else {
                        Adminizer.log.error(`DataAccessor > getFieldsConfig > Model not found: ${modelName} when ${key}`);
                    }
                }
            }

            // Set required and type attributes
            fldConfig.required = Boolean(fldConfig.required ?? modelField.required);
            // Default type for field. Could be fetched from config file or model if not defined in config file.
            // The model layer has a single temporal type (`date`), the UI distinguishes
            // date/datetime/time. Default to `datetime` so the time part survives editing;
            // a date-only column can be narrowed with `type: "date"` in the model config.
            const modelFieldType = modelField.type === "date" ? "datetime" : modelField.type;
            fldConfig.type = ((fldConfig.type || modelFieldType).toLowerCase() as FieldsTypes);

            // Normalize final configuration (fldConfig is always an object here, normalize never returns undefined)
            fldConfig = this.adminizer.configHelper.normalizeFieldConfig(this.adminizer, fldConfig, key, modelField)!;

            // Add new field to result set
            result[key] = {config: fldConfig, model: modelField, populated: populatedModelFieldsConfig, modelConfig: associatedModelConfig };
        });

        this.fields = this.orderFieldsByConfig(result, fieldsConfig, actionConfig.fields);
        return this.fields;
    }

    private orderFieldsByConfig(
        fields: Fields,
        globalFieldsConfig: FieldsModels = {},
        actionFieldsConfig: FieldsModels = {}
    ): Fields {
        const orderedFields: Fields = {};
        const appendField = (fieldName: string) => {
            if (!Object.prototype.hasOwnProperty.call(fields, fieldName)) {
                return;
            }

            if (Object.prototype.hasOwnProperty.call(orderedFields, fieldName)) {
                return;
            }

            orderedFields[fieldName] = fields[fieldName];
        };

        Object.keys(actionFieldsConfig || {}).forEach(appendField);
        Object.keys(globalFieldsConfig || {}).forEach(appendField);
        Object.keys(fields).forEach(appendField);

        return orderedFields;
    }

    private getAssociatedFieldsConfig(modelName: string): { [fieldName: string]: Field } | undefined {
        const resolvedModelName = this.adminizer.modelHandler.resolveModelName(modelName);
        const model = this.adminizer.modelHandler.model.get(resolvedModelName);
        const modelConfig = this.getModelConfig(resolvedModelName);
        if (!model || !modelConfig) {
            return undefined;
        }

        // Check if user has access to the associated model
        const tokenId = `read-${resolvedModelName}-${MODEL_TOKEN_SUFFIX}`;
        if (!this.adminizer.accessRightsHelper.hasPermission(tokenId, this.user)) {
            Adminizer.log.debug(`getAssociatedFieldsConfig > No access rights to ${this.actionVerb} model: ${resolvedModelName}`);
            return undefined;
        }

        const associatedFields: { [fieldName: string]: Field } = {};
        // Get the main fields configuration
        const fieldsConfig = modelConfig.fields || {};

        // Merge action-specific fields configuration if it exists
        const addCfg = typeof modelConfig.add === "object" ? modelConfig.add : undefined;
        const editCfg = typeof modelConfig.edit === "object" ? modelConfig.edit : undefined;
        const listCfg = typeof modelConfig.list === "object" ? modelConfig.list : undefined;
        let actionSpecificConfig: FieldsModels = {};
        switch (this.action) {
            case "add":
                actionSpecificConfig = addCfg?.fields || {};
                break;
            case "edit":
                actionSpecificConfig = editCfg?.fields || {};
                break;
            case "list":
                actionSpecificConfig = listCfg?.fields || {};
                break;
            case "view":
                actionSpecificConfig = editCfg?.fields || {};
                break;
            case "remove":
                actionSpecificConfig = {}
                break;
            default:
                throw `Action type error: unknown type [${this.action}]`
        }
        const mergedFieldsConfig = {...fieldsConfig, ...actionSpecificConfig};

        // Loop through model attributes and apply access checks
        Object.entries(model.attributes).forEach(([key, modelField]) => {
            const fieldConfig = mergedFieldsConfig[key];

            // Creating a basic config
            let fldConfig: Field["config"] = {key: key, title: key};

            // If fieldConfig exists, normalize it and merge with the basic config
            if (fieldConfig) {
                const normalizedFieldConfig = this.adminizer.configHelper.normalizeFieldConfig(this.adminizer, fieldConfig, key, modelField);
                if (!normalizedFieldConfig) return;
                if (!this.checkFieldAccess(key, normalizedFieldConfig)) return;
                fldConfig = { ...fldConfig, ...normalizedFieldConfig };
            }

            // Add the field to associatedFields regardless of config presence
            associatedFields[key] = {
                config: fldConfig,
                model: modelField,
                populated: undefined, // set undefined for already populated fields
                modelConfig: undefined
            };
        });

        return associatedFields;
    }

    private checkFieldAccess(key: string, fieldConfig: Field["config"]): boolean {
        if (this.modelResource.model.primaryKey === key) {
            return true;
        }

        if (this.user.isAdministrator) {
            return true;
        }

        const userGroups = this.user.groups?.map((group: Group) => group.name.toLowerCase());
        // Check if `groupsAccessRights` is set in the fieldConfig
        if (fieldConfig.groupsAccessRights) {
            const allowedGroups = fieldConfig.groupsAccessRights.map((item: string) => item.toLowerCase());
            return userGroups && userGroups.some(group => allowedGroups.includes(group));
        } else {
            // If no specific groups are allowed, deny access if the user is in "default user group"
            return !userGroups || !userGroups.includes(this.adminizer.config.registration?.defaultUserGroup);
        }
    }

    private getSelectedFields(select?: CriteriaSelect): Set<string> | undefined {
        if (!select) {
            return undefined;
        }

        if (Array.isArray(select)) {
            return new Set(select);
        }

        return new Set(
            Object.entries(select)
                .filter(([, enabled]) => enabled)
                .map(([field]) => field)
        );
    }

    private getPopulateCriteria(criteria: QueryCriteria | undefined, fieldKey: string): QueryCriteria | undefined {
        const populateConfig = criteria?.populate?.[fieldKey];
        return populateConfig && populateConfig !== true ? populateConfig : undefined;
    }

    private canUseSelectedFieldFallback(): boolean {
        return this.user.isAdministrator || this.adminizer.config.auth?.enable === false;
    }

    /**
     * Returns filtered record applying config from this.fields on this record
     * @data - record from a specific model */
    public process<T>(record: T, criteria?: QueryCriteria): Partial<T> {
        // Initialize fields configuration, if it was not already set
        if (!this.fields) {
            this.fields = this.getFieldsConfig();
        }
        const filteredRecord: Partial<T> = {};

        // Set the primary key value
        const primaryKey = (this.modelResource.model.primaryKey ?? 'id') as keyof T;
        filteredRecord[primaryKey] = record[primaryKey];

        for (const fieldKey in record) {
            const fieldConfig = this.fields[fieldKey];
            const fieldValue = record[fieldKey];
            // Skip fields if they are not in the configuration
            if (!fieldConfig) continue;

            // Check access to the field
            if (this.checkFieldAccess(fieldKey, fieldConfig.config)) {
                const fieldType = fieldConfig.config.type;
                const populateCriteria = this.getPopulateCriteria(criteria, fieldKey);
                const selectedAssociatedFields = this.getSelectedFields(populateCriteria?.select);
                // Handle fields that are not associations
                if (fieldType !== 'association' && fieldType !== 'association-many') {
                    filteredRecord[fieldKey] = fieldValue;
                }
                // Handle association-many
                else if (fieldType === 'association-many') {
                    if (Array.isArray(fieldValue)) {
                        // If the field value is an array of objects
                        filteredRecord[fieldKey] = (fieldValue.every(item => typeof item === 'object')
                            ? fieldValue.map(associatedRecord => this.filterAssociatedRecord(associatedRecord, fieldConfig.populated, selectedAssociatedFields))
                            : fieldValue) as T[Extract<keyof T, string>]; // If the array contains IDs, pass them as is (it can contain ids, because this function also can be called before saving something)
                    } else {
                        // If fieldValue is not an array, log an error
                        Adminizer.log.error(
                            `Expected array for association-many field: ${fieldConfig.model.model}.${fieldKey}, but got:`,
                            fieldValue
                        );
                    }
                }
                // Handle single associations
                else if (fieldType === 'association') {
                    if (fieldValue && typeof fieldValue === 'object') {
                        // If the field value is an object
                        filteredRecord[fieldKey] = this.filterAssociatedRecord(fieldValue, fieldConfig.populated, selectedAssociatedFields) as T[Extract<keyof T, string>];
                    } else {
                        // If the field value is an ID or null, pass it as is (it can contain id, because this function also can be called before saving something)
                        filteredRecord[fieldKey] = fieldValue;
                    }
                }
                // Handle cases where the field value is null or undefined
                else if (fieldValue === undefined || fieldValue === null) {
                    filteredRecord[fieldKey] = null;
                }
                // Log an error for unexpected scenarios
                else {
                    Adminizer.log.error(
                        `Unexpected field configuration or value for: ${fieldConfig.model.model}.${fieldKey}`
                    );
                }
            }
        }

        return filteredRecord;
    }

    /** Filters associated records (simplified process() function) */
    private filterAssociatedRecord<T>(associatedRecord: T, associatedFieldsConfig: {
        [fieldName: string]: Field
    }, selectedFields?: Set<string>): Partial<T> {
        if (!associatedFieldsConfig && !selectedFields) {
            return {}
        }
        const filteredAssociatedRecord: Partial<T> = {};
        for (const assocFieldKey in associatedRecord) {
            if (selectedFields && !selectedFields.has(assocFieldKey)) {
                continue;
            }

            const assocFieldConfig = associatedFieldsConfig?.[assocFieldKey];
            const assocFieldValue = associatedRecord[assocFieldKey];

            if (assocFieldConfig && this.checkFieldAccess(assocFieldKey, assocFieldConfig.config)) {
                filteredAssociatedRecord[assocFieldKey] = assocFieldValue;
                continue;
            }

            if (selectedFields && this.canUseSelectedFieldFallback()) {
                filteredAssociatedRecord[assocFieldKey] = assocFieldValue;
            }
        }

        return filteredAssociatedRecord;
    }

    /** Process for an array of records */
    public processMany<T>(records: T[], criteria?: QueryCriteria): Partial<T>[] {
        return records.map(record => this.process(record, criteria));
    }

    public async sanitizeUserRelationAccess(criteria: QueryCriteria = {}): Promise<QueryCriteria> {
        let sanitizedCriteria: CriteriaWhere = {};

        // Retrieve model configuration from adminpanel config
        const modelName = this.modelResource.model.modelname;
        const modelConfig = this.modelResource.config;

        // Check if the model has `userAccessRelation` configured
        if (!this.user.isAdministrator && modelConfig && modelConfig.userAccessRelation) {
            Adminizer.log.warn(
                `[userAccessRelation] Model "${modelName}" has userAccessRelation="${modelConfig.userAccessRelation}". ` +
                `User "${this.user.login}" (id: ${this.user.id}) will only see records they own.`
            );
            // Get access field from userAccessRelation
            const userAccessRelation = modelConfig.userAccessRelation;
            if (typeof userAccessRelation === 'string') {
                let accessField = userAccessRelation;

                // Check if the relation points to `User` or `Group` in the model's attributes
                const modelAttributes = this.modelResource.model.attributes;
                const relation = modelAttributes[accessField];
                const relationModel = this.resolveRelationTarget(relation?.model);
                const relationCollection = this.resolveRelationTarget(relation?.collection);

                if (!relation || !['user', 'group'].includes(relationModel ?? relationCollection ?? "")) {
                    throw new Error(`Invalid userAccessRelation configuration for model ${modelName}`);
                }

                // Determine if the current user matches the access criteria
                if (relationModel) {
                    if (relationModel === 'user') {
                        // Filter by the user's ID if related to User as a model
                        sanitizedCriteria = {...sanitizedCriteria, [accessField]: this.user.id};
                    } else if (relationModel === 'group') {
                        // Filter by user's group membership if related to Group as a model
                        const userGroups = this.user.groups?.map((group: Group) => group.id);
                        sanitizedCriteria = {...sanitizedCriteria, [accessField]: {in: userGroups}};
                    }
                }

                /** Warning: collection relation access is not supported and needs adapter-level processing */
                if (relationCollection) {
                    Adminizer.log.warn(`Collection relation is not supported and was not tested. You may have an error here: ${JSON.stringify(relation, null, 2)}`)
                    if (relationCollection === 'user') {
                        // Ensure user's ID is part of the associated collection to User
                        sanitizedCriteria = {...sanitizedCriteria, [accessField]: {contains: this.user.id}};
                    } else if (relationCollection === 'group') {
                        // Ensure user's groups intersect with the collection to Group
                        const userGroups = this.user.groups?.map((group: Group) => group.id);
                        sanitizedCriteria = {...sanitizedCriteria, [accessField]: {intersects: userGroups}};
                    }
                }

            } else if (typeof userAccessRelation === 'object' && userAccessRelation !== null) {
                // If userAccessRelation is an object
                const {field, via} = userAccessRelation;

                // Get attributes of the current model and validate the intermediate relation
                const modelAttributes = this.modelResource.model.attributes;
                const intermediateRelation = modelAttributes[field];
                if (!intermediateRelation || !intermediateRelation.model) {
                    throw new Error(`Invalid intermediate relation configuration for field "${field}" in model ${modelName}`);
                }

                // Retrieve the intermediate model
                const intermediateModel = this.adminizer.modelHandler.model.get(intermediateRelation.model.toLowerCase());
                if (!intermediateModel) {
                    throw new Error(`Intermediate model "${intermediateRelation.model}" not found`);
                }

                // Validate the `via` field in the intermediate model
                const intermediateAttributes = intermediateModel.attributes;
                const viaRelation = intermediateAttributes[via];
                if (!viaRelation || this.resolveRelationTarget(viaRelation.model) !== 'user') {
                    throw new Error(
                        `Unsupported or invalid via field "${via}" in intermediate model "${intermediateRelation.model}". ` +
                        `Currently, only relations to "User" are supported`
                    );
                }

                // Fetch all intermediate records associated with the user
                const intermediateRecords = await this.accessRelationModel(intermediateRelation.model).find({where: {[via]: this.user.id}});
                const intermediateIds = (intermediateRecords || []).map((r) => r.id);
                // Filter main model by all matching intermediate record IDs
                sanitizedCriteria = {...sanitizedCriteria, [field]: {in: intermediateIds}};
            }
        }

        return {
            ...criteria,
            where: mergeCriteriaWhere(criteria.where, sanitizedCriteria)
        };
    }

    public async setUserRelationAccess<T>(record: T): Promise<Partial<T>> {
        let updatedRecord: Partial<T> = {...record};

        // Check if model has `userAccessRelation` configured
        if (this.modelResource.config && this.modelResource.config.userAccessRelation) {
            // Get access field from userAccessRelation
            const userAccessRelation = this.modelResource.config.userAccessRelation;
            if (typeof userAccessRelation === 'string') {
                let accessField = userAccessRelation;
                // only admin can set user access relation manually
                if (updatedRecord[accessField as keyof T] && !this.user.isAdministrator) {
                    delete updatedRecord[accessField as keyof T];
                }

                // Check if the relation points to `User` or `Group` in the model's attributes
                const modelAttributes = this.modelResource.model.attributes;
                const relation = modelAttributes[accessField];
                const relationModel = this.resolveRelationTarget(relation?.model);
                if (relation && ['user', 'group'].includes(relationModel ?? "")) {
                    if (relationModel === 'user') {
                        if (!this.user.isAdministrator) {
                            updatedRecord[accessField as keyof T] = this.user.id as T[keyof T];
                        }
                    } else if (relationModel === 'group') {
                        const userGroups = this.user.groups as Group[] || [];
                        if (userGroups.length === 1) {
                            updatedRecord[accessField as keyof T] = userGroups[0].id as T[keyof T];
                        } else {
                            throw new Error('Record cannot be saved because the user is associated with none or multiple groups.');
                        }
                    }
                }
            } else if (typeof userAccessRelation === 'object' && userAccessRelation !== null) {
                // If userAccessRelation is an object
                const {field, via} = userAccessRelation;

                // For non-admins: validate that the chosen intermediate record belongs to the user
                if (updatedRecord[field as keyof T] && !this.user.isAdministrator) {
                    if (!via) {
                        throw new Error(`Invalid userAccessRelation configuration: "via" is required`);
                    }

                    const modelAttributes = this.modelResource.model.attributes;
                    const intermediateRelation = modelAttributes[field];
                    if (!intermediateRelation || !intermediateRelation.model) {
                        throw new Error(`Invalid intermediate relation configuration for field "${field}" in model ${this.modelResource.model.modelname}`);
                    }

                    const intermediateModel = this.adminizer.modelHandler.model.get(intermediateRelation.model.toLowerCase());
                    if (!intermediateModel) {
                        throw new Error(`Intermediate model "${intermediateRelation.model}" not found`);
                    }

                    // Validate the `via` field in the intermediate model
                    const intermediateAttributes = intermediateModel.attributes;
                    const viaRelation = intermediateAttributes[via];
                    if (!viaRelation || this.resolveRelationTarget(viaRelation.model) !== 'user') {
                        throw new Error(
                            `Unsupported or invalid via field "${via}" in intermediate model "${intermediateRelation.model}". ` +
                            `Currently, only relations to "User" are supported`
                        );
                    }

                    const intermediatePk = (intermediateModel.primaryKey ?? 'id') as string;
                    const chosenId = typeof updatedRecord[field as keyof T] === 'object'
                        ? (updatedRecord[field as keyof T] as Record<string, unknown>)[intermediatePk]
                        : updatedRecord[field as keyof T];
                    const record = await this.accessRelationModel(intermediateRelation.model).findOne({where: {[intermediatePk]: chosenId, [via]: this.user.id}});
                    if (!record) {
                        throw new Error(`Access denied: "${field}" does not belong to the current user`);
                    }
                }
            }
        }
        return updatedRecord;
    }
}


function getTokenAction(apAction: ActionType) {
    switch (apAction) {
        case "add":
            return "create";
        case "list":
        case "view":
            return "read";
        case "edit":
            return "update";
        case "remove":
            return "delete";
    }
}


