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
import {AbstractModel, Attribute} from "./model/AbstractModel";
import { Group } from "../models/Group";
import { User } from "../models/User";
import { isObject } from "../helpers/JsUtils";
import { CriteriaSelect, CriteriaWhere, QueryCriteria } from "../interfaces/queryCriteria";
import { RecordAccessResolver } from "./access-graph/RecordAccessResolver";
import { RecordAccessCache } from "./access-graph/RecordAccessCache";
import { AccessGraphResolver, isGraphParentEdge } from "./access-graph/AccessGraphResolver";
import { getTokenAction, modelCrudToken } from "./access-graph/shared";

function hasCriteriaContent(criteria: CriteriaWhere): boolean {
    return Object.keys(criteria).length > 0;
}

/**
 * Rewrites the association keys of an access filter to their foreign-key columns
 * (`via`), so the condition lands on plain columns of the JOIN alias in every adapter.
 * Returns `undefined` when a key cannot be resolved to a real column — such a filter
 * must keep the post-read verification instead of producing a broken JOIN.
 */
function mapAccessWhereToJoinColumns(
    where: CriteriaWhere,
    attributes: Record<string, Attribute> | undefined
): CriteriaWhere | undefined {
    const result: CriteriaWhere = {};
    for (const [key, value] of Object.entries(where)) {
        const attr = attributes?.[key];
        if (attr?.type === "association-many") {
            return undefined;
        }
        if (attr?.type !== "association") {
            result[key] = value;
            continue;
        }
        // An association key must resolve to a plain FK column; a `via` that is itself
        // the association (TypeORM models without a declared FK property) cannot.
        if (!attr.via || attributes?.[attr.via]?.type === "association") {
            return undefined;
        }
        result[attr.via] = value;
    }
    return result;
}

/**
 * Access-filter shapes every adapter can AND into a JOIN's ON clause: plain columns
 * compared to a primitive or to an `{in: [...primitives]}` list. Anything else (logic
 * operators, adapter-specific subquery operands) stays on the post-read verification.
 */
function isPushdownSafeWhere(where: CriteriaWhere): boolean {
    const isPrimitive = (value: unknown): boolean =>
        typeof value === "string" || typeof value === "number" || typeof value === "boolean";

    return Object.entries(where).every(([key, value]) => {
        if (key === "and" || key === "or" || key === "not" || key.includes("$") || key.includes(".")) {
            return false;
        }
        if (isPrimitive(value)) {
            return true;
        }
        return isObject(value)
            && Object.keys(value).length === 1
            && Array.isArray((value as { in?: unknown }).in)
            && (value as { in: unknown[] }).in.every(isPrimitive);
    });
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
        // Spreading would drop the caller's own condition on a key record access also
        // constrains (a filter on the parent column of a graph model, typically) —
        // both must hold, so a collision becomes an explicit AND.
        const collides = Object.keys(sanitizedCriteria).some((key) => key in criteriaWhere);
        if (!collides) {
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
    private associatedPrimaryKeyCache = new Map<Field, string | undefined>();
    private recordAccessAssociationFieldsCache?: [string, Field][];
    /** Set on the internal accessors used to verify associations — see disablePopulateAccess(). */
    private populateAccessDisabled = false;
    /** Accessors of associated models, so their access lookups are resolved once per model. */
    private associatedAccessorCache = new Map<string, DataAccessor>();
    /** Per-request record-access resolver; its memoized id lists live as long as this accessor. */
    private recordAccessResolver?: RecordAccessResolver;

    /**
     * Memoization shared with the other accessors of the same request; pass one when
     * building several accessors for one page so the membership lookups run once.
     */
    public readonly recordAccessCache: RecordAccessCache;

    constructor(
        adminizer: Adminizer,
        user: User,
        modelResource: ModelResource,
        action: ActionType,
        recordAccessCache?: RecordAccessCache
    ) {
        this.recordAccessCache = recordAccessCache ?? new RecordAccessCache();
        this.adminizer = adminizer;
        this.user = user;
        this.modelResource = modelResource;
        this.action = action
        this.actionVerb = getTokenAction(this.action);

    }

    private getModelConfig(resourceName: string): ModelConfig | undefined {
        const config = this.adminizer.config.models?.[resourceName];
        return isObject(config) ? config as ModelConfig : undefined;
    }

    private resolveRelationTarget(modelName?: string, resourceName?: string): string | undefined {
        if (!modelName) {
            return undefined;
        }

        return this.adminizer.modelHandler.resolveAssociationResource(modelName, resourceName);
    }

    private getRelationModel<T = any>(modelName: string, resourceName?: string) {
        const resolvedResourceName = this.resolveRelationTarget(modelName, resourceName);
        return resolvedResourceName
            ? this.adminizer.modelHandler.getResource(resolvedResourceName) as AbstractModel<T> | undefined
            : undefined;
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

        // No access rights to the model at all beats every other outcome, including "no fields"
        const tokenId = modelCrudToken(this.actionVerb, this.modelResource.name);
        if (!this.adminizer.accessRightsHelper.hasStaticPermission(tokenId, this.user)) {
            Adminizer.log.debug(`getFieldsConfig > No access rights to ${this.actionVerb} model: ${this.modelResource.name}`);
            return undefined;
        }

        if (!this.modelResource.model || !this.modelResource.model.attributes) {
            return {};
        }

        // get action and field configs
        const actionConfig = ControllerHelper.findActionConfig(this.modelResource, this.action);
        const fieldsConfig = this.modelResource.config?.fields || {};
        const modelAttributes = this.modelResource.model.attributes;
        const primaryKey = (this.modelResource.model.primaryKey ?? 'id') as string;

        const result: Fields = {};
        Object.entries(modelAttributes).forEach(([key, modelField]) => {
            // The fields that are recorded separately from the connection in some ORMs, because they are processed at the level above them.
            if(modelAttributes[key].primaryKeyForAssociation === true) {
                return;
            }

            // Supports shorthand model attributes: fieldName: 'string'
            if (typeof modelField === "string") {
                modelField = {type: modelField};
            }

            // Set association type for a field, on a copy — the shared model attributes stay untouched
            if (modelField && typeof modelField === "object") {
                if (modelField.model) {
                    modelField = {...modelField, type: "association"};
                }
                if (modelField.collection) {
                    modelField = {...modelField, type: "association-many"};
                }
            }

            // Action-specific config has priority over global; objects are merged
            const globalFieldConfig = fieldsConfig[key];
            const actionFieldConfig = actionConfig.fields?.[key];
            const rawFieldConfig = globalFieldConfig || actionFieldConfig
                ? { ...globalFieldConfig, ...actionFieldConfig }
                : undefined;

            let fldConfig = this.buildBaseFieldConfig(key, modelField, rawFieldConfig, primaryKey);
            if (!fldConfig) {
                return;
            }

            // Populate associated fields configuration if field is an association
            let associatedModelConfig: ModelConfig = undefined;
            let populatedModelFieldsConfig = {};
            if (modelField.type === "association" || modelField.type === "association-many") {
                const modelName = modelField.model || modelField.collection;
                const resolvedModelName = this.resolveRelationTarget(modelName, modelField.resourceName);

                if (modelName && resolvedModelName) {
                    if (!this.adminizer.accessRightsHelper.hasStaticPermission(modelCrudToken("read", resolvedModelName), this.user)) {
                        Adminizer.log.silly(`No access rights to read associated model: ${resolvedModelName}`);
                        return;
                    }

                    const model = this.adminizer.modelHandler.getResource(resolvedModelName);
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

    private getAssociatedFieldsConfig(resourceName: string): { [fieldName: string]: Field } | undefined {
        const model = this.adminizer.modelHandler.getResource(resourceName);
        const modelConfig = this.getModelConfig(resourceName);
        if (!model || !modelConfig) {
            return undefined;
        }

        // Defense in depth: the caller checks read access too, but this method must stay
        // safe on its own for any future call site.
        if (!this.adminizer.accessRightsHelper.hasStaticPermission(modelCrudToken("read", resourceName), this.user)) {
            Adminizer.log.debug(`getAssociatedFieldsConfig > No access rights to read model: ${resourceName}`);
            return undefined;
        }

        const associatedFields: { [fieldName: string]: Field } = {};
        // Get the main fields configuration
        const fieldsConfig = modelConfig.fields || {};
        const primaryKey = (model.primaryKey ?? 'id') as string;

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
                throw new Error(`Action type error: unknown type [${this.action}]`);
        }
        const mergedFieldsConfig = {...fieldsConfig, ...actionSpecificConfig};

        // Loop through model attributes and apply access checks
        Object.entries(model.attributes).forEach(([key, modelField]) => {
            const fldConfig = this.buildBaseFieldConfig(key, modelField, mergedFieldsConfig[key], primaryKey);
            if (!fldConfig) {
                return;
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

    /**
     * Base config for a field: the normalized declared config merged over `{key, title}`,
     * or `undefined` when the config is invalid or field access is denied.
     */
    private buildBaseFieldConfig(
        key: string,
        modelField: Field["model"],
        rawFieldConfig: FieldsModels[string] | undefined,
        primaryKey: string | undefined
    ): Field["config"] | undefined {
        let fldConfig: Field["config"] = {key: key, title: key};

        if (rawFieldConfig) {
            const normalizedFieldConfig = this.adminizer.configHelper.normalizeFieldConfig(this.adminizer, rawFieldConfig, key, modelField);
            if (!normalizedFieldConfig) {
                return undefined;
            }
            if (!this.checkFieldAccess(key, normalizedFieldConfig, primaryKey)) {
                return undefined;
            }
            fldConfig = { ...fldConfig, ...normalizedFieldConfig };
        }

        return fldConfig;
    }

    private checkFieldAccess(key: string, fieldConfig: Field["config"], primaryKey: string | undefined): boolean {
        // The primary key of the record's own model is always visible
        if (primaryKey !== undefined && primaryKey === key) {
            return true;
        }

        if (this.user.isAdministrator) {
            return true;
        }

        const userGroups = this.user.groups?.map((group: Group) => group.name.toLowerCase());
        // Check if `groupsAccessRights` is set in the fieldConfig
        if (fieldConfig.groupsAccessRights) {
            const allowedGroups = fieldConfig.groupsAccessRights.map((item: string) => item.toLowerCase());
            return Boolean(userGroups?.some(group => allowedGroups.includes(group)));
        }

        // No explicit list: the field is visible to everyone except members of the
        // registration default group (both sides compared lowercased).
        const defaultUserGroup = this.adminizer.config.registration?.defaultUserGroup?.toLowerCase();
        return !userGroups || !defaultUserGroup || !userGroups.includes(defaultUserGroup);
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

    /** Administrators, and every user when authorization is switched off entirely. */
    private hasUnrestrictedAccess(): boolean {
        return this.user.isAdministrator || this.adminizer.config.auth?.enable === false;
    }

    private canUseSelectedFieldFallback(): boolean {
        return this.hasUnrestrictedAccess();
    }

    /**
     * Primary key of a field's associated model, for the PK-always-visible rule on
     * populated records. Cached per field config: `process()` asks once per associated
     * item of every record, and the answer cannot change within an accessor's lifetime.
     */
    private associatedPrimaryKey(fieldConfig: Field): string | undefined {
        if (this.associatedPrimaryKeyCache.has(fieldConfig)) {
            return this.associatedPrimaryKeyCache.get(fieldConfig);
        }

        const modelName = fieldConfig.model?.model || fieldConfig.model?.collection;
        const primaryKey = modelName
            ? this.getRelationModel(modelName, fieldConfig.model?.resourceName)?.primaryKey as string | undefined
            : undefined;
        this.associatedPrimaryKeyCache.set(fieldConfig, primaryKey);
        return primaryKey;
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

        // No access rights to the model at all: fail closed with an empty record
        if (!this.fields) {
            return filteredRecord;
        }

        // Set the primary key value
        const primaryKey = (this.modelResource.model.primaryKey ?? 'id') as keyof T;
        filteredRecord[primaryKey] = record[primaryKey];

        for (const fieldKey in record) {
            const fieldConfig = this.fields[fieldKey];
            const fieldValue = record[fieldKey];
            // Skip fields if they are not in the configuration
            if (!fieldConfig) continue;

            // Check access to the field
            if (this.checkFieldAccess(fieldKey, fieldConfig.config, primaryKey as string)) {
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
                            ? fieldValue.map(associatedRecord => this.filterAssociatedRecord(associatedRecord, fieldConfig.populated, selectedAssociatedFields, this.associatedPrimaryKey(fieldConfig)))
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
                else {
                    if (fieldValue && typeof fieldValue === 'object') {
                        // If the field value is an object
                        filteredRecord[fieldKey] = this.filterAssociatedRecord(fieldValue, fieldConfig.populated, selectedAssociatedFields, this.associatedPrimaryKey(fieldConfig)) as T[Extract<keyof T, string>];
                    } else {
                        // If the field value is an ID or null, pass it as is (it can contain id, because this function also can be called before saving something)
                        filteredRecord[fieldKey] = fieldValue;
                    }
                }
            }
        }

        return filteredRecord;
    }

    /** Filters associated records (simplified process() function) */
    private filterAssociatedRecord<T>(associatedRecord: T, associatedFieldsConfig: {
        [fieldName: string]: Field
    }, selectedFields?: Set<string>, associatedPrimaryKey?: string): Partial<T> {
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

            if (assocFieldConfig && this.checkFieldAccess(assocFieldKey, assocFieldConfig.config, associatedPrimaryKey)) {
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

    /**
     * {@link processMany} plus record-level access on populated associations.
     *
     * `sanitizeUserRelationAccess` confines the queried model only, while adapters
     * populate associations regardless of record access — so a record the user may not reach can
     * still be read through a relation of one they may. Records the target model's own rules
     * keep out of reach are reduced to their primary key here, which costs one batched query
     * per associated restricted model (memoized for the accessor's lifetime) — except the
     * associations whose confinement {@link pushDownPopulateAccess} already compiled into
     * the populate JOIN itself: those arrive pre-reduced and are skipped.
     *
     * Read paths only: write paths hand back the record the user just supplied.
     */
    public async processManyWithAccess<T>(records: T[], criteria?: QueryCriteria): Promise<Partial<T>[]> {
        const processed = this.processMany(records, criteria);

        // Administrators only: `auth.enable: false` does not lift record scoping
        // (`RecordAccessResolver.buildWhere` exempts administrators alone), so the
        // populated records of a restricted model must not escape those rules either.
        if (this.populateAccessDisabled || !processed.length || this.user.isAdministrator) {
            return processed;
        }

        for (const [fieldKey, fieldConfig] of this.recordAccessAssociationFields()) {
            if (criteria?.populateOn?.[fieldKey]) {
                // The access condition ran inside the populate JOIN; records out of
                // reach already arrived as bare foreign keys.
                continue;
            }

            const referenced = this.collectAssociatedIds(processed, fieldKey, fieldConfig);
            if (!referenced.size) {
                continue;
            }

            const visibleIds = await this.visibleAssociatedIds(fieldConfig, Array.from(referenced.values()));
            if (visibleIds === undefined) {
                continue; // the associated model carries no record access rules
            }

            for (const record of processed) {
                this.reduceInvisibleAssociations(record, fieldKey, fieldConfig, visibleIds);
            }
        }

        return processed;
    }

    /**
     * Compiles the record-access confinement of single populated associations into the
     * criteria (`populateOn`), so the adapter ANDs it into the populate JOIN's ON clause
     * and {@link processManyWithAccess} skips the post-read query for those fields — the
     * closed records arrive as bare foreign keys straight from the database. Only the
     * associations the adapter declares pushdown-capable and whose access filter has an
     * adapter-portable shape are compiled; the rest keep the post-read verification.
     *
     * Single associations only: a filtered-out belongsTo row still carries its foreign
     * key, while a record dropped from a populated collection would lose its id — and an
     * edit form saving that truncated collection would silently sever the links.
     *
     * Any incoming `populateOn` is discarded — this method is its sole author, because
     * the verification skip above trusts the key.
     */
    public async pushDownPopulateAccess(criteria: QueryCriteria = {}): Promise<QueryCriteria> {
        const {populateOn: _discarded, ...rest} = criteria as QueryCriteria & { populateOn?: unknown };
        const result = rest as QueryCriteria;
        if (this.populateAccessDisabled || this.user.isAdministrator) {
            return result;
        }

        const populateOn: Record<string, CriteriaWhere> = {};
        for (const [fieldKey, fieldConfig] of this.recordAccessAssociationFields()) {
            if (fieldConfig.config?.type !== "association") {
                continue;
            }
            if (!this.modelResource.model?.canPushdownPopulateAccess?.(fieldKey)) {
                continue;
            }

            const resourceName = this.associatedResourceName(fieldConfig);
            const accessor = resourceName ? this.associatedAccessor(resourceName) : undefined;
            if (!accessor) {
                continue;
            }

            let accessWhere: CriteriaWhere;
            try {
                accessWhere = await accessor.getRecordAccessWhere();
            } catch (e) {
                // Unresolvable access rules keep the post-read verification, which fails closed.
                Adminizer.log.error(`Could not resolve the record access of associated model "${resourceName}"`, e);
                continue;
            }
            if (!hasCriteriaContent(accessWhere) || !isPushdownSafeWhere(accessWhere)) {
                continue;
            }
            const joinWhere = mapAccessWhereToJoinColumns(
                accessWhere,
                this.adminizer.modelHandler.getResource(resourceName!)?.attributes
            );
            if (!joinWhere) {
                continue;
            }
            populateOn[fieldKey] = joinWhere;
        }

        return Object.keys(populateOn).length ? {...result, populateOn} : result;
    }

    /**
     * Turns the association verification of {@link processManyWithAccess} off for this accessor.
     * Used for the accessors that perform that verification themselves: they only read ids,
     * and two restricted models referencing each other sideways would otherwise recurse.
     */
    public disablePopulateAccess(): this {
        this.populateAccessDisabled = true;
        return this;
    }

    /**
     * Association fields whose target model is access-restricted and whose content therefore
     * needs verifying — except the edge pointing at this model's own graph parent, where
     * the target is reachable by construction (a visible child hangs off a visible parent).
     */
    private recordAccessAssociationFields(): [string, Field][] {
        if (this.recordAccessAssociationFieldsCache) {
            return this.recordAccessAssociationFieldsCache;
        }

        // May run before the first process() call — build the fields config here, or an
        // empty list would be computed and cached.
        if (!this.fields) {
            this.fields = this.getFieldsConfig();
        }

        const result: [string, Field][] = [];
        for (const [fieldKey, fieldConfig] of Object.entries(this.fields ?? {})) {
            const fieldType = fieldConfig.config?.type;
            if (fieldType !== "association" && fieldType !== "association-many") {
                continue;
            }

            const resourceName = this.associatedResourceName(fieldConfig);
            if (!resourceName || !this.hasRecordAccessRules(resourceName)) {
                continue;
            }
            if (isGraphParentEdge(this.adminizer, this.modelResource.name, fieldKey, resourceName)) {
                continue;
            }

            result.push([fieldKey, fieldConfig]);
        }

        this.recordAccessAssociationFieldsCache = result;
        return result;
    }

    /** True when the model confines its records to the user, by its own relation or the graph. */
    private hasRecordAccessRules(resourceName: string): boolean {
        const modelConfig = this.adminizer.config.models?.[resourceName] as ModelConfig | undefined;
        if (modelConfig?.userAccessRelation) {
            return true;
        }

        return AccessGraphResolver.covers(this.adminizer, resourceName);
    }

    private associatedResourceName(fieldConfig: Field): string | undefined {
        const modelName = fieldConfig.model?.model || fieldConfig.model?.collection;
        return modelName ? this.resolveRelationTarget(modelName, fieldConfig.model?.resourceName) : undefined;
    }

    /** Primary keys of the populated records referenced by a field, keyed by their string form. */
    private collectAssociatedIds<T>(records: Partial<T>[], fieldKey: string, fieldConfig: Field): Map<string, unknown> {
        const primaryKey = this.associatedPrimaryKey(fieldConfig) ?? "id";
        const ids = new Map<string, unknown>();

        for (const record of records) {
            const value = (record as Record<string, unknown>)[fieldKey];
            const items = Array.isArray(value) ? value : [value];
            for (const item of items) {
                // Bare ids need no verification: they expose nothing beyond the reference
                // the parent record already carries.
                if (!item || typeof item !== "object") {
                    continue;
                }
                const id = (item as Record<string, unknown>)[primaryKey];
                if (id !== null && id !== undefined) {
                    ids.set(String(id), id);
                }
            }
        }

        return ids;
    }

    /** Replaces populated records the user may not reach with their bare primary key. */
    private reduceInvisibleAssociations<T>(
        record: Partial<T>,
        fieldKey: string,
        fieldConfig: Field,
        visibleIds: Set<string>
    ): void {
        const primaryKey = this.associatedPrimaryKey(fieldConfig) ?? "id";
        const data = record as Record<string, unknown>;
        const value = data[fieldKey];

        const reduce = (item: unknown): unknown => {
            if (!item || typeof item !== "object") {
                return item;
            }
            const id = (item as Record<string, unknown>)[primaryKey];
            if (id === null || id === undefined || visibleIds.has(String(id))) {
                return item;
            }
            return id;
        };

        data[fieldKey] = Array.isArray(value) ? value.map(reduce) : reduce(value);
    }

    /**
     * The associated model's own view accessor, shared between the pushdown and the
     * post-read verification so its access lookups resolve once per model.
     */
    private associatedAccessor(resourceName: string): DataAccessor | undefined {
        let accessor = this.associatedAccessorCache.get(resourceName);
        if (!accessor) {
            const model = this.adminizer.modelHandler.getResource(resourceName);
            if (!model) {
                return undefined;
            }
            accessor = new DataAccessor(this.adminizer, this.user, {
                name: resourceName,
                config: this.adminizer.config.models?.[resourceName] as ModelConfig,
                model,
                uri: `${this.adminizer.config.routePrefix}/model/${resourceName}`
            }, "view", this.recordAccessCache).disablePopulateAccess();
            this.associatedAccessorCache.set(resourceName, accessor);
        }
        return accessor;
    }

    /**
     * Subset of `ids` the user may reach in the associated model, or `undefined` when that
     * model has no record access rules. The target's own accessor is reused across calls, so its
     * membership lookups are resolved once.
     */
    private async visibleAssociatedIds(fieldConfig: Field, ids: unknown[]): Promise<Set<string> | undefined> {
        const resourceName = this.associatedResourceName(fieldConfig);
        const accessor = resourceName ? this.associatedAccessor(resourceName) : undefined;
        if (!resourceName || !accessor) {
            return new Set();
        }
        const model = this.adminizer.modelHandler.getResource(resourceName);
        if (!model) {
            return new Set();
        }

        let accessWhere: CriteriaWhere;
        try {
            accessWhere = await accessor.getRecordAccessWhere();
        } catch (e) {
            // A misconfigured graph must not widen what the relation exposes.
            Adminizer.log.error(`Could not resolve the record access of associated model "${resourceName}"`, e);
            return new Set();
        }
        if (!hasCriteriaContent(accessWhere)) {
            return undefined;
        }

        const primaryKey = (model.primaryKey ?? "id") as string;
        // The accessor is shared with the access resolution above, so `find` reuses its
        // memoized membership lookups instead of querying them again.
        const rows = await model.find({where: {[primaryKey]: {in: ids}}, select: [primaryKey]}, accessor);
        return new Set((rows ?? []).map((row: Record<string, unknown>) => String(row[primaryKey])));
    }

    public async sanitizeUserRelationAccess(criteria: QueryCriteria = {}): Promise<QueryCriteria> {
        const sanitizedCriteria = await this.getRecordAccessResolver().buildWhere();

        // Both adapters read field conditions from `where` when it has keys and from the
        // top level otherwise. Injecting `where` here would therefore make them ignore the
        // top-level ones — a flat `{id}` update would silently widen to every record the
        // user may reach — so the flat form is folded into `where` first.
        // `populateOn` is discarded: only `pushDownPopulateAccess` may author it — the
        // association verification trusts the key, so a smuggled one must not survive.
        const {where, skip, limit, sort, select, populate, populateOn: _discarded, ...flat} =
            criteria as QueryCriteria & Record<string, unknown>;
        // `sort` is an ordering directive only as a string; anything else is a model field.
        if (sort !== undefined && typeof sort !== "string") {
            (flat as Record<string, unknown>).sort = sort;
        }

        const criteriaWhere = Object.keys(flat).length
            ? mergeCriteriaWhere(where, flat as CriteriaWhere)
            : where;

        return {
            ...(skip !== undefined ? {skip} : {}),
            ...(limit !== undefined ? {limit} : {}),
            ...(typeof sort === "string" ? {sort} : {}),
            ...(select !== undefined ? {select} : {}),
            ...(populate !== undefined ? {populate} : {}),
            where: mergeCriteriaWhere(criteriaWhere, sanitizedCriteria)
        };
    }

    public setUserRelationAccess<T>(record: T): Promise<Partial<T>> {
        return this.getRecordAccessResolver().applyWriteRules(record);
    }

    /**
     * Where-fragment confining this model to the records the user may reach
     * (`userAccessRelation` or accessGraph); `{}` means no record-level constraint.
     *
     * For surfaces that reference records without reading them through the model API —
     * the change history, for one — and therefore cannot rely on
     * {@link sanitizeUserRelationAccess} doing it for them.
     */
    public getRecordAccessWhere(): Promise<CriteriaWhere> {
        return this.getRecordAccessResolver().buildWhere();
    }

    private getRecordAccessResolver(): RecordAccessResolver {
        this.recordAccessResolver ??= new RecordAccessResolver(
            this.adminizer, this.user, this.modelResource, this.actionVerb, this.recordAccessCache
        );
        return this.recordAccessResolver;
    }
}
