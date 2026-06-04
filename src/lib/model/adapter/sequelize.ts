import {
    Sequelize,
    DataTypes,
    ModelAttributes,
    ModelStatic,
    IncludeOptions,
    Op,
    HasMany,
    BelongsTo,
    BelongsToMany,
    HasOne
} from "sequelize";
import {AbstractAdapter, AbstractModel, Attribute} from "../AbstractModel";
import type {RuntimeModelDefinition} from "../AbstractModel";
import { CriteriaPopulate, CriteriaSelect, QueryCriteria } from "../../../interfaces/queryCriteria";
import path from "path";
import fs from "fs";
import {pathToFileURL} from "url";
import {fileURLToPath} from "url";
import {v4 as uuid} from "uuid";


function generateAssociationsFromSchema(
    models: Record<string, any>,
    schemas: Record<string, any>
) {
    for (const modelName in schemas) {
        const schema = schemas[modelName];
        const model = models[modelName];
        if (!model) continue;

        for (const fieldName in schema) {
            const field = schema[fieldName];

            if (field.collection && field.via) {
                const targetModel = models[field.collection];
                const targetSchema = schemas[field.collection];
                const inverseField = targetSchema?.[field.via];

                // Normalize join table to lowercase for consistency across dialects
                const throughTableName = [modelName, field.collection]
                    .sort()
                    .join("")
                    .toLowerCase();

                // 💡 M:N connection
                if (inverseField && inverseField.collection === modelName) {
                    model.belongsToMany(targetModel, {
                        through: throughTableName,
                        as: fieldName,
                        foreignKey: `${modelName}Id`,
                        otherKey: `${field.collection}Id`
                    });
                }
                // 💡 O:M communication (one to many)
                else {
                    let foreignKey = `${modelName}Id`;
                    if (field.collection === modelName) {
                        foreignKey = `${field.via}Id`;
                    }

                    model.hasMany(targetModel, {
                        as: fieldName,
                        foreignKey,
                    });

                    const alias = field.via;
                    const belongsToOptions = {foreignKey} as any;
                    if (targetModel.rawAttributes[alias] || targetModel.associations[alias]) {
                        belongsToOptions.as = `${alias}Ref`;
                    } else {
                        belongsToOptions.as = alias;
                    }

                    targetModel.belongsTo(model, belongsToOptions);
                }
            }

            // 💡 O:1 or 1:1 (belongsTo)
            if (field.model) {
                const targetModel = models[field.model];
                if (!targetModel) continue;

                // Avoid naming collisions by using an explicit foreign key
                const alias = fieldName;
                const foreignKey = `${alias}Id`;

                // Reuse the attribute name unless it already exists on the model or association
                let asName = alias;
                if (model.rawAttributes[alias] || model.associations[alias]) {
                    asName = `${alias}Ref`;
                }

                const belongsToOptions: any = {
                    as: asName,
                    foreignKey,
                };
                
                // Add onDelete constraint if specified
                if (field.onDelete) {
                    belongsToOptions.onDelete = field.onDelete;
                }

                model.belongsTo(targetModel, belongsToOptions);
            }
        }
    }
}

function resolveType(type: any): Attribute["type"] {
    const sqlType = typeof type.toString === "function"
        ? type.toString().toLowerCase()
        : "";
    if (
        sqlType.includes("string") ||
        sqlType.includes("uuid") ||
        sqlType.includes("char") ||
        sqlType.includes("text")
    ) {
        return "string";
    }
    // tinyint(1) is used by MySQL/MariaDB for BOOLEAN
    if (sqlType.includes("bool") || sqlType === "tinyint(1)") return "boolean";
    if (sqlType.includes("int") || sqlType.includes("float") || sqlType.includes("decimal")) return "number";
    if (sqlType.includes("json")) return "json";
    if (sqlType.includes("date")) return "string";
    return "ref";
}

export function mapSequelizeToAdminizerAttributes(model: ModelStatic<any>): Record<string, Attribute> {
    const result: Record<string, Attribute> = {};


    const rawAttrs = model.getAttributes();
    for (const name in rawAttrs) {
        const meta = rawAttrs[name];
        result[name] = {
            type: resolveType(meta.type),
            required: meta.allowNull !== undefined ? !meta.allowNull : false,
            allowNull: meta.allowNull,
            unique: !!meta.unique,
            defaultsTo: meta.defaultValue,
            columnName: meta.field || name,
        };
    }


    for (const alias in model.associations) {
        const assoc = model.associations[alias];

        switch (assoc.associationType) {
            case "BelongsTo": {
                const a = assoc as BelongsTo;
                result[a.foreignKey]["primaryKeyForAssociation"] = true;
                result[alias] = {
                    type: "association",
                    model: a.target.name,
                    via: a.foreignKey as string,
                };
                break;
            }
            case "HasOne": {
                const a = assoc as HasOne;
                result[a.foreignKey]["primaryKeyForAssociation"] = true;
                result[alias] = {
                    type: "association",
                    model: a.target.name,
                    via: a.foreignKey as string,
                };
                break;
            }
            case "HasMany": {
                const a = assoc as HasMany;
                result[alias] = {
                    type: "association-many",
                    collection: a.target.name,
                    via: a.foreignKey as string,
                };
                break;
            }
            case "BelongsToMany": {
                const a = assoc as BelongsToMany;
                result[alias] = {
                    type: "association-many",
                    collection: a.target.name,
                    via: a.otherKey as string,
                };
                break;
            }
            default:

                break;
        }
    }

    return result;
}

type AbstractFieldType =
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "ref"
    | "association"
    | "association-many";

type AbstractAttribute = {
    type: AbstractFieldType;
    required?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
};

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


export class SequelizeModel<T> extends AbstractModel<T> {
    private model: ModelStatic<any>;

    constructor(modelName: string, model: ModelStatic<any>) {
        super(
            modelName,
            mapSequelizeToAdminizerAttributes(model),
            model.primaryKeyAttribute,
            model.name
        );
        this.model = model;
    }

    private _buildJsonContainsCondition(targetKey: string, item: unknown): any {
        const pattern = `%${JSON.stringify(item).replace(/[%_]/g, "\\$&")}%`;
        const attribute = this.model.rawAttributes?.[targetKey];
        const columnName = typeof attribute?.field === "string" ? attribute.field : targetKey;

        return Sequelize.where(
            Sequelize.cast(Sequelize.col(`${this.model.name}.${columnName}`), "TEXT"),
            {[Op.like as any]: pattern}
        );
    }

    _convertCriteriaToSequelize(criteria: any): any {
        // Special handling for Sequelize.literal() at the top level
        if (criteria && typeof criteria === 'object' && 'val' in criteria && typeof criteria.val === 'string') {
            // This is a Sequelize.literal object, return it as-is
            return criteria;
        }

        const result: any = {};

        // Handle both string keys and Symbol keys (Op.and, Op.or, etc.)
        const allKeys = [
            ...Object.keys(criteria),
            ...Object.getOwnPropertySymbols(criteria)
        ];

        for (const key of allKeys) {
            const value = criteria[key];

            // 🧠 Replace the key with `via` if this is an association (MUST happen before null/other checks)
            let targetKey: string | typeof key = key;
            
            // Only process string keys for association replacement
            if (typeof key === 'string') {
                const attr = this.attributes?.[key];
                
                // Check if this is an association attribute (either from attributes or model.associations)
                if (attr?.type === "association" && attr.via) {
                    targetKey = attr.via;
                } else if (this.model.associations[key]) {
                    // Fallback: check associations directly
                    const assoc = this.model.associations[key];
                    if (assoc && 'foreignKey' in assoc) {
                        targetKey = assoc.foreignKey as string;
                    }
                }
            }

            // Special handling for null values (IS NULL condition)
            if (value === null) {
                result[targetKey] = {[Op.is]: null};
                continue;
            }

            // 🔹 Handle Sequelize Op operators (already in Sequelize format)
            if (key === (Op.and as any) || key === 'and') {
                result[Op.and as any] = Array.isArray(value)
                    ? value.map((item: any) => this._convertCriteriaToSequelize(item))
                    : [];
                continue;
            }

            if (key === (Op.or as any) || key === 'or') {
                result[Op.or as any] = Array.isArray(value)
                    ? value.map((item: any) => this._convertCriteriaToSequelize(item))
                    : [];
                continue;
            }

            if (key === (Op.not as any) || key === 'not' || key === '$not') {
                result[Op.not as any] = this._convertCriteriaToSequelize(value);
                continue;
            }

            // Skip Symbol keys that are not handled above (should not happen, but safety check)
            if (typeof key === 'symbol') {
                continue;
            }

            if (Array.isArray(value)) {
                // ✅ Array processing - use the IN operator
                result[targetKey] = {[Op.in]: value};
            } else if (typeof value === "object" && !Array.isArray(value)) {
                // Check if value already contains Sequelize Op operators
                // Need to check both string keys and Symbol keys
                const valueKeys = Object.keys(value);
                const valueSymbols = Object.getOwnPropertySymbols(value);
                
            
                // Helper function to check if a symbol/op is a Sequelize operator
                const isSequelizeOp = (op: string | symbol): boolean => {
                    // Check direct Symbol equality first
                    if (op === (Op.gt as any) || op === (Op.gte as any) || op === (Op.lt as any) || op === (Op.lte as any) ||
                        op === (Op.eq as any) || op === (Op.ne as any) || op === (Op.in as any) || op === (Op.notIn as any) ||
                        op === (Op.like as any) || op === (Op.iLike as any) || op === (Op.between as any) ||
                        op === (Op.startsWith as any) || op === (Op.endsWith as any) || op === (Op.is as any) || op === (Op.not as any)) {
                        return true;
                    }
                    
                    // Fallback: check by Symbol description (handles different Symbol instances)
                    if (typeof op === 'symbol') {
                        const desc = op.description || op.toString();
                        return desc.includes('gt') || desc.includes('gte') || desc.includes('lt') || desc.includes('lte') ||
                               desc.includes('eq') || desc.includes('ne') || desc.includes('in') || desc.includes('notIn') ||
                               desc.includes('like') || desc.includes('iLike') || desc.includes('between') ||
                               desc.includes('startsWith') || desc.includes('endsWith') || desc.includes('is') || desc.includes('not');
                    }
                    
                    // Check string operators used by Adminizer's adapter-neutral criteria format
                    return op === '$gt' || op === '$gte' || op === '$lt' || op === '$lte' ||
                           op === '$eq' || op === '$ne' || op === '$in' || op === '$notIn' ||
                           op === '$like' || op === '$iLike' || op === '$between' ||
                           op === '$startsWith' || op === '$endsWith' || op === '$is' || op === '$not' ||
                           op === 'not';
                };

                const hasSequelizeOp = [...valueKeys, ...valueSymbols].some(isSequelizeOp);

                // If already Sequelize format, pass through
                if (hasSequelizeOp) {
                    result[targetKey] = value;
                   
                    continue;
                }

                // Handle operator objects like {contains: 'val'} from Adminizer's criteria format
                for (const [op, val] of Object.entries(value)) {
                    if (val === undefined || val === null) continue;

                    switch (op) {
                        case "eq":
                            result[targetKey] = {[Op.eq as any]: val};
                            break;
                        case "ne":
                            result[targetKey] = {[Op.ne as any]: val};
                            break;
                        case "gt":
                            result[targetKey] = {[Op.gt as any]: val};
                            break;
                        case "gte":
                            result[targetKey] = {[Op.gte as any]: val};
                            break;
                        case "lt":
                            result[targetKey] = {[Op.lt as any]: val};
                            break;
                        case "lte":
                            result[targetKey] = {[Op.lte as any]: val};
                            break;
                        case "contains":
                            // Check if field is a date/datetime type
                            const attr = this.model.rawAttributes?.[targetKey as string];
                            const typeName = attr?.type as any;
                            // Check type name (works for DATE, DATEONLY, TIME, etc.)
                            const typeStr = typeof typeName === 'function'
                                ? typeName.name.toLowerCase()
                                : String(typeName).toLowerCase();
                            const isDateType = typeStr.includes('date') || typeStr.includes('time');
                            
                            // TIME type should use LIKE (it's stored as 'HH:MM' string)
                            const isTimeType = typeStr === 'time';
                            
                            if (isDateType && !isTimeType) {
                                // For date fields (not time), check if value is a valid date
                                const dateValue = new Date(String(val));
                                if (isNaN(dateValue.getTime())) {
                                    // Invalid date string - skip this condition entirely
                                    // This prevents moment.js warnings
                                    // Don't add anything to result - field will be excluded from WHERE
                                } else {
                                    // Valid date - use exact match
                                    result[targetKey] = {[Op.eq as any]: dateValue};
                                }
                            } else {
                                // For time fields and non-date fields - use Op.like with wildcards
                                result[targetKey] = {[Op.like as any]: `%${val}%`};
                            }
                            break;
                        case "startsWith":
                            result[targetKey] = {[Op.startsWith as any]: val};
                            break;
                        case "endsWith":
                            result[targetKey] = {[Op.endsWith as any]: val};
                            break;
                        case ">":
                            result[targetKey] = {[Op.gt as any]: val};
                            break;
                        case ">=":
                            result[targetKey] = {[Op.gte as any]: val};
                            break;
                        case "<":
                            result[targetKey] = {[Op.lt as any]: val};
                            break;
                        case "<=":
                            result[targetKey] = {[Op.lte as any]: val};
                            break;
                        case "!=":
                            result[targetKey] = {[Op.ne as any]: val};
                            break;
                        case "in":
                            result[targetKey] = {[Op.in as any]: val};
                            break;
                        case "notIn":
                            result[targetKey] = {[Op.notIn as any]: val};
                            break;
                        case "nin":
                            result[targetKey] = {[Op.notIn as any]: val};
                            break;
                        case "between":
                            result[targetKey] = {[Op.between as any]: val};
                            break;
                        case "isNull":
                            if (val) {
                                result[targetKey] = {[Op.is as any]: null};
                            }
                            break;
                        case "isNotNull":
                            if (val) {
                                result[targetKey] = {[Op.not as any]: null};
                            }
                            break;
                        case "regex":
                            result[targetKey] = {[Op.regexp as any]: val};
                            break;
                        case "jsonContains": {
                            const values = Array.isArray(val) ? val : [val];
                            const clauses = values.map((item) => this._buildJsonContainsCondition(targetKey as string, item));
                            result[Op.and as any] = [
                                ...(result[Op.and as any] ?? []),
                                ...clauses
                            ];
                            break;
                        }
                        case "$is":
                            result[targetKey] = {[Op.is as any]: val};
                            break;
                        case "$not":
                            result[targetKey] = {[Op.not as any]: val};
                            break;
                        case "$ne":
                            result[targetKey] = {[Op.ne as any]: val};
                            break;
                        case "not":
                            result[targetKey] = {[Op.not as any]: val};
                            break;
                        default:
                            result[targetKey] = {[Op.eq as any]: val};
                    }
                }
            } else {
                result[targetKey] = value;
            }
        }

        return result;
    }


    _convertAdminizerCriteriaToSequelizeOptions(criteria: any): {
        where?: any;
        limit?: number;
        offset?: number;
        order?: any[];
        attributes?: string[];
    } {
        // For Sequelize: extract adapter-neutral pagination and ordering params.
        // Everything else is WHERE criteria.
        // 'sort' as string = ordering ("field direction") — goes to ORDER BY
        // 'sort' as boolean/object = model field — goes to WHERE
        const criteriaSortValue = 'sort' in criteria ? (criteria as any).sort : undefined;
        const isOrderingSort = typeof criteriaSortValue === 'string';

        const {where: nestedWhere, skip, limit, sort: criteriaSort, select, populate, ...rest} = criteria;

        // If 'sort' is a model field (not an ordering string), put it back
        if (!isOrderingSort && criteriaSortValue !== undefined) {
            rest.sort = criteriaSortValue;
        }

        // Check if nestedWhere has any keys (including Symbol keys like Op.and)
        const hasNestedWhereKeys = nestedWhere && (
            Object.keys(nestedWhere).length > 0 ||
            Object.getOwnPropertySymbols(nestedWhere).length > 0
        );

        // If there's an explicit 'where' key, use it. Otherwise use rest (field conditions).
        const rawWhere = hasNestedWhereKeys ? nestedWhere : rest;

        const where = this._convertCriteriaToSequelize(rawWhere);

        const result: any = {where};

        if (typeof skip === "number") {
            result.offset = skip;
            // console.debug("→ offset =", skip);
        }
        if (typeof limit === "number") {
            result.limit = limit;
            // console.debug("→ limit =", limit);
        }
        if (typeof criteriaSort === "string") {
            const [field, dir] = criteriaSort.trim().split(/\s+/);
            result.order = [[field, dir?.toUpperCase() === "DESC" ? "DESC" : "ASC"]];
            // console.debug("→ order =", result.order);
        } else if (criteriaSort && typeof criteriaSort === "object") {
            result.order = Object.entries(criteriaSort).map(([field, dir]) => [
                field,
                String(dir).toUpperCase() === "DESC" ? "DESC" : "ASC"
            ]);
        }

        const attributes = this._buildAttributes(select);
        if (attributes) {
            result.attributes = attributes;
        }

        return result;
    }

    async _assignAssociations(instance: any, assocData: Record<string, any>) {
        for (const [alias, ids] of Object.entries(assocData)) {
            const assoc = this.model.associations[alias];
            if (!assoc) continue;

            //@ts-ignore
            const {set: setAccessor, add: addAccessor} = assoc.accessors;

            if (Array.isArray(ids)) {
                if (typeof instance[setAccessor] === 'function') {
                    await instance[setAccessor](ids);
                    continue;
                }
                if (typeof instance[addAccessor] === 'function') {
                    for (const id of ids) {
                        await instance[addAccessor](id);
                    }
                    continue;
                }
            }

            if (typeof instance[setAccessor] === 'function') {
                await instance[setAccessor](ids);
            } else if (typeof instance[addAccessor] === 'function') {
                await instance[addAccessor](ids);
            }
        }
    }


    // --- CREATE ---

    protected async _create(data: Record<string, any>): Promise<T> {
        // console.clear()

        const assocNames = Object.keys(this.model.associations);
        const plainData: Record<string, any> = {};
        const assocData: Record<string, any> = {};
        for (const [key, val] of Object.entries(data)) {
            if (assocNames.includes(key)) {
                const assoc = this.model.associations[key];
                // For BelongsTo, set the FK directly in plainData so NOT NULL constraints are satisfied
                if (assoc && assoc.associationType === 'BelongsTo') {
                    const fk = assoc.foreignKey;
                    if (val !== null && val !== undefined) {
                        plainData[fk] = typeof val === 'object' ? val[assoc.target.primaryKeyAttribute] : val;
                    }
                } else {
                    assocData[key] = val;
                }
            } else {
                plainData[key] = val;
            }
        }


        let instance: any;
        try {
            instance = await this.model.create(plainData);
            // console.debug(">> Instance created (without associations):", instance.toJSON());
        } catch (err) {
            // console.error("!! Error during create(plainData):", err);
            throw err;
        }

        // assocData = { example: 5, userAPs: [1,2,3], category: 7, tags: [11,22] }
        // this.model.associations - your associations object
        for (const [alias, ids] of Object.entries(assocData)) {
            const assoc = this.model.associations[alias];
            if (!assoc) {
                // console.warn(`Association "${alias}" not defined on model`);
                continue;
            }

            // @ts-ignore accessors is present
            const {set: setAccessor, add: addAccessor} = assoc.accessors;

            if (Array.isArray(ids)) {
                if (typeof instance[setAccessor] === 'function') {
                    await instance[setAccessor](ids);
                    continue;
                }
                if (typeof instance[addAccessor] === 'function') {
                    for (const id of ids) {
                        await instance[addAccessor](id);
                    }
                    continue;
                }
            }

            if (typeof instance[setAccessor] === 'function') {
                await instance[setAccessor](ids);
            } else if (typeof instance[addAccessor] === 'function') {
                await instance[addAccessor](ids);
            } else {
                // console.warn(`No suitable accessor for "${alias}": tried set=${setAccessor}, add=${addAccessor}`);
            }
        }

        await instance.reload({include: Object.values(this.model.associations)});

        const pk = this.primaryKey;
        const fresh = (await this.model.findByPk(
            instance.get(pk),
            {include: assocNames.map(a => ({association: a}))}
        )).toJSON();

        // console.debug(">> Result after reload:", fresh?.toJSON());
        return fresh as any;
    }


    // --- FIND ONE ---
    protected async _findOne(criteria: QueryCriteria): Promise<T | null> {
        // console.debug(">> _findOne: input criteria:", criteria);

        const {where, attributes} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const includes = criteria.populate
            ? this._buildCriteriaIncludes(criteria.populate)
            : this._buildIncludes();
        // console.debug(">> _findOne: converted where:", where);
        // console.debug(">> _findOne: includes:", includes);

        let instance = null;
        try {
            instance = await this.model.findOne({where, attributes, include: includes});
            // console.debug(">> _findOne: raw instance:", instance ? instance.toJSON() : null);
        } catch (err) {
            // console.error("!! _findOne: error when calling findOne:", err);
            throw err;
        }

        if (!instance) {
            // console.debug(">> _findOne: nothing found");
            return null;
        }

        const plain = instance.get({plain: true}) as T;
        // console.debug(">> _findOne: plain result:", plain);
        return plain;
    }

    // --- FIND MANY ---
    protected async _find(
        criteria: QueryCriteria = {},
    ): Promise<T[]> {
        const assocNames = Object.keys(this.model.associations);
        // console.debug(">> _find: input criteria:", criteria, "options:", options);

        const {where, limit, offset, order, attributes} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const hasRelationPathCondition = this._hasRelationPathCondition(where);
        const usedRelationAliases = hasRelationPathCondition
            ? this._extractRelationAliasesFromWhere(where)
            : new Set<string>();

        const includes = criteria.populate
            ? this._buildCriteriaIncludes(criteria.populate)
            : assocNames.map((alias) => this._buildListInclude(alias, usedRelationAliases, hasRelationPathCondition));

        // console.debug(">> _find: where, limit, offset, order, includes:", {
        //   where,
        //   limit,
        //   offset,
        //   order,
        //   includes,
        // });

        let instances: any[];
        instances = await this.model.findAll({
            where,
            attributes,
            limit,
            offset,
            order,
            include: includes,
            subQuery: hasRelationPathCondition ? false : undefined
        });


        for (const inst of instances) {
            //For each association, we call getxxx () once again
            for (const alias of assocNames) {
                // @ts-ignore accessors is present
                const getAccessor = this.model.associations[alias].accessors.get;
                if (typeof inst[getAccessor] === "function") {
                    try {
                        const related = await inst[getAccessor]();
                        const mapped = Array.isArray(related)
                            ? related.map((r: any) => r.toJSON())
                            : related?.toJSON();
                        // console.debug(`---- get${alias}():`, mapped);
                    } catch (e) {
                        // console.error(`!! error when calling ${getAccessor}():`, e);
                    }
                }
            }
        }

        const plain = instances.map(i => i.get({plain: true}) as T);
        // console.debug(">> _find: plain results:", plain);


        return plain;
    }

    /**
     * Public method for raw SQL where clauses (Sequelize.literal support)
     * Bypasses Adminizer criteria conversion for direct Sequelize usage
     */
    async findWithRawWhere(
        where: any,
        options: { limit?: number; offset?: number; order?: any; populate?: boolean } = {}
    ): Promise<T[]> {
        const assocNames = Object.keys(this.model.associations);
        const includes = options.populate !== false
            ? assocNames.map(a => ({association: a}))
            : [];

        const instances = await this.model.findAll({
            where,
            limit: options.limit,
            offset: options.offset,
            order: options.order,
            include: includes
        });

        return instances.map(i => i.get({plain: true}) as T);
    }

    /**
     * Public method for count with raw SQL where clauses
     */
    async countWithRawWhere(where: any): Promise<number> {
        const assocNames = Object.keys(this.model.associations);
        const include = assocNames.map((association) => ({ association }));

        return await this.model.count({
            where,
            include,
            distinct: true,
            col: this.primaryKey || this.model.primaryKeyAttribute || 'id'
        });
    }

    // --- UPDATE ONE ---
    protected async _updateOne(criteria: QueryCriteria, data: Partial<T>): Promise<T | null> {
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);

        const record = await this.model.findOne({where});
        if (!record) return null;

        const assocNames = Object.keys(this.model.associations);
        const plainData: Record<string, any> = {};
        const assocData: Record<string, any> = {};

        for (const [key, val] of Object.entries(data)) {
            if (assocNames.includes(key)) {
                const assoc = this.model.associations[key];
                if (assoc && assoc.associationType === 'BelongsTo') {
                    const fk = assoc.foreignKey;
                    if (val !== null && val !== undefined) {
                        plainData[fk] = typeof val === 'object' ? (val as Record<string, unknown>)[assoc.target.primaryKeyAttribute] : val;
                    }
                } else {
                    assocData[key] = val;
                }
            } else {
                plainData[key] = val;
            }
        }

        await record.update(plainData);
        await this._assignAssociations(record, assocData);
        await record.reload({include: Object.values(this.model.associations)});

        return record.get({plain: true}) as T;
    }

    // --- UPDATE MANY ---
    protected async _update(criteria: QueryCriteria, data: Partial<T>): Promise<T[]> {
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);

        const assocNames = Object.keys(this.model.associations);
        const plainData: Record<string, any> = {};
        const assocData: Record<string, any> = {};

        for (const [key, val] of Object.entries(data)) {
            if (assocNames.includes(key)) {
                const assoc = this.model.associations[key];
                if (assoc && assoc.associationType === 'BelongsTo') {
                    const fk = assoc.foreignKey;
                    if (val !== null && val !== undefined) {
                        plainData[fk] = typeof val === 'object' ? (val as Record<string, unknown>)[assoc.target.primaryKeyAttribute] : val;
                    }
                } else {
                    assocData[key] = val;
                }
            } else {
                plainData[key] = val;
            }
        }

        const records = await this.model.findAll({where});

        for (const record of records) {
            await record.update(plainData);
            await this._assignAssociations(record, assocData);
        }

        const reloaded = await this.model.findAll({
            where,
            include: Object.values(this.model.associations)
        });

        return reloaded.map((r: any) => r.get({plain: true}) as T);
    }


    // --- DESTROY ONE ---
    protected async _destroyOne(criteria: QueryCriteria): Promise<T | null> {
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const record = await this.model.findOne({where});

        if (!record) return null;

        const assocNames = Object.keys(this.model.associations);

        for (const alias of assocNames) {
            const assoc = this.model.associations[alias];
            // @ts-ignore: accessors should exist
            const getAccessor = assoc.accessors?.get;

            if (typeof record[getAccessor] === "function") {
                try {
                    const related = await record[getAccessor]();

                    // 🧹Deleting related posts
                    if (Array.isArray(related)) {
                        for (const r of related) {
                            if (typeof r.destroy === "function") {
                                await r.destroy();
                            }
                        }
                    } else if (related && typeof related.destroy === "function") {
                        await related.destroy();
                    }

                } catch (e) {
                    // console.warn(`Failed to fetch/delete relation "${alias}":`, e);
                }
            }
        }

        const raw = record.get({plain: true});
        await record.destroy();

        return raw;
    }


    // --- DESTROY MANY ---
    protected async _destroy(criteria: QueryCriteria): Promise<T[]> {
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);

        const records = await this.model.findAll({where});
        const assocNames = Object.keys(this.model.associations);

        for (const record of records) {
            for (const alias of assocNames) {
                const assoc = this.model.associations[alias];

                // 🛑 We don’t touch parental ties
                if (assoc.associationType === "BelongsTo") continue;

                // @ts-ignore accessor exists
                const getAccessor = assoc.accessors?.get;

                if (typeof record[getAccessor] === "function") {
                    try {
                        const related = await record[getAccessor]();

                        if (Array.isArray(related)) {
                            for (const rel of related) {
                                if (typeof rel.destroy === "function") {
                                    await rel.destroy();
                                }
                            }
                        } else if (related && typeof related.destroy === "function") {
                            await related.destroy();
                        }
                    } catch (e) {
                        // console.warn(`Failed to delete relation ${alias}:`, e);
                    }
                }
            }
        }

        const raw = records.map((r: any) => r.get({plain: true}));
        await this.model.destroy({where});

        return raw;
    }


    // --- COUNT ---
    protected async _count(criteria: QueryCriteria = {}): Promise<number> {
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const assocNames = Object.keys(this.model.associations);
        const include = assocNames.map((association) => ({ association }));

        const result = await this.model.count({
            where,
            include,
            distinct: true,
            col: this.primaryKey || this.model.primaryKeyAttribute || 'id'
        });

        return result;
    }

    // --- HELPER ---
    private _hasRelationPathCondition(input: any): boolean {
        if (!input || typeof input !== 'object') {
            return false;
        }

        if (Array.isArray(input)) {
            return input.some((item) => this._hasRelationPathCondition(item));
        }

        const keys: Array<string | symbol> = [
            ...Object.keys(input),
            ...Object.getOwnPropertySymbols(input)
        ];

        for (const key of keys) {
            if (typeof key === 'string' && /^\$[A-Za-z0-9_]+\.[A-Za-z0-9_]+\$$/.test(key)) {
                return true;
            }

            const value = input[key as keyof typeof input];
            if (value && typeof value === 'object' && this._hasRelationPathCondition(value)) {
                return true;
            }
        }

        return false;
    }

    private _extractRelationAliasesFromWhere(input: any, aliases: Set<string> = new Set<string>()): Set<string> {
        if (!input || typeof input !== 'object') {
            return aliases;
        }

        if (Array.isArray(input)) {
            input.forEach((item) => this._extractRelationAliasesFromWhere(item, aliases));
            return aliases;
        }

        const keys: Array<string | symbol> = [
            ...Object.keys(input),
            ...Object.getOwnPropertySymbols(input)
        ];

        for (const key of keys) {
            if (typeof key === 'string') {
                const match = key.match(/^\$([A-Za-z0-9_]+)\.[A-Za-z0-9_]+\$$/);
                if (match?.[1]) {
                    aliases.add(match[1]);
                }
            }

            const value = input[key as keyof typeof input];
            if (value && typeof value === 'object') {
                this._extractRelationAliasesFromWhere(value, aliases);
            }
        }

        return aliases;
    }

    private _buildListInclude(
        alias: string,
        usedRelationAliases: Set<string>,
        hasRelationPathCondition: boolean
    ): IncludeOptions {
        const include: IncludeOptions = { association: alias };

        if (!hasRelationPathCondition) {
            return include;
        }

        const association = this.model.associations[alias] as any;
        const isUsedInWhere = usedRelationAliases.has(alias);
        const isHasMany = association instanceof HasMany || association?.associationType === 'HasMany';

        // When filtering by relation path ($alias.field$), extra joined hasMany associations
        // can duplicate base rows and break page size. Load such associations separately.
        if (isHasMany && !isUsedInWhere) {
            (include as any).separate = true;
        }

        return include;
    }

    private _buildIncludes(): IncludeOptions[] {
        return Object.keys(this.model.associations).map(key => ({association: key}));
    }

    private _buildAttributes(select?: CriteriaSelect): string[] | undefined {
        if (!select) {
            return undefined;
        }

        if (Array.isArray(select)) {
            const attributes = select.filter((field) => this.model.rawAttributes?.[field]);
            return attributes.length ? attributes : undefined;
        }

        const attributes = Object.entries(select)
            .filter(([field, enabled]) => enabled && this.model.rawAttributes?.[field])
            .map(([field]) => field);

        return attributes.length ? attributes : undefined;
    }

    private _buildCriteriaIncludes(populate: CriteriaPopulate): IncludeOptions[] {
        return Object.entries(populate).map(([association, nestedCriteria]) => {
            if (nestedCriteria === true) {
                return {association};
            }

            const {
                where,
                attributes,
                order,
                limit,
            } = this._convertAdminizerCriteriaToSequelizeOptions(nestedCriteria);

            const include: IncludeOptions = {association};

            if (where && (Object.keys(where).length > 0 || Object.getOwnPropertySymbols(where).length > 0)) {
                include.where = where;
            }
            if (attributes) {
                include.attributes = attributes;
            }
            if (order) {
                include.order = order;
            }
            if (typeof limit === "number") {
                include.limit = limit;
            }
            if (nestedCriteria.populate) {
                include.include = this._buildCriteriaIncludes(nestedCriteria.populate);
            }

            return include;
        });
    }
}

export class SequelizeAdapter extends AbstractAdapter {
    public sequelize: Sequelize;
    public Model = SequelizeModel;

    constructor(sequelize: Sequelize) {
        super("sequelize", sequelize);
        this.sequelize = sequelize;
    }

    get models(): Record<string, any> {
        return this.sequelize.models;
    }

    getModel(modelName: string): any {
        const matchedKey = Object.keys(this.sequelize.models).find(key => key.toLowerCase() === modelName.toLowerCase());
        if (!matchedKey) {
            return undefined;
        }
        return this.sequelize.models[matchedKey];
    }

    getAttributes(modelName: string): any {
        const model = this.getModel(modelName);
        return model?.getAttributes();
    }

    async registerRuntimeModel(definition: RuntimeModelDefinition): Promise<ModelStatic<any>> {
        const existingModel = this.getModel(definition.modelName);
        if (existingModel) {
            return existingModel;
        }

        const model = generateSequelizeModel(this.sequelize, definition.modelName, definition.schema);
        generateAssociationsFromSchema(this.sequelize.models, {
            [definition.modelName]: definition.schema,
        });

        if (definition.sync) {
            await model.sync();
        }

        return model;
    }

    /** Registration of system models */
    static async registerSystemModels(sequelize: Sequelize, alter: boolean = true): Promise<void> {
        // Get current file directory from import.meta.url
        const currentDir = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd();
        
        // Try multiple possible model locations
        const possiblePaths = [
            path.resolve(currentDir, "../../../../models"),
            path.resolve(currentDir, "../../../../src/models"),
            path.resolve(currentDir, "../../../models"),
            path.resolve(currentDir, "../../../src/models"),
            path.resolve(process.cwd(), "node_modules/adminizer/src/models"),
            path.resolve(process.cwd(), "node_modules/adminizer/models")
        ];

        let modelsDir: string | null = null;
        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                modelsDir = possiblePath;
                break;
            }
        }

        if (!modelsDir) {
            return;
        }

        let files = fs.readdirSync(modelsDir).filter((f: string) => f.endsWith(".js"));
        if (!files.length) {
            files = fs.readdirSync(modelsDir).filter((f: string) => f.endsWith(".ts") && !f.endsWith(".d.ts"));
        }
        if (!files.length) {
            return;
        }

        const schemas: Record<string, any> = {};
        for (const file of files) {
            const modelName = path.basename(file, path.extname(file));
            const filePath = path.resolve(modelsDir, file);
            const mod = await import(pathToFileURL(filePath).href);
            const definition = mod.default;
            schemas[modelName] = definition;
            generateSequelizeModel(sequelize, modelName, definition);
        }
        generateAssociationsFromSchema(sequelize.models, schemas);
        // Check ORM_ALTER environment variable before sync
        if (process.env.ORM_ALTER !== 'false' && alter) {
            await sequelize.sync();
        } else {
        }
    }
}

/** Generation of the Sequelize model from Adminizer's model definition */
function generateSequelizeModel(
    sequelize: Sequelize,
    modelName: string,
    rawAttributes: Record<string, any>
) {
    const attributes: ModelAttributes = {};
    let primaryKey: string | null = null;

    for (const field in rawAttributes) {
        const attr = {...rawAttributes[field]};

        // 💥 Skip associations (handled separately)
        if (attr.model || attr.collection) {
            continue;
        }

        if (attr.primaryKey) {
            primaryKey = field;
            attr.primaryKey = true;
        }

        if (attr.uuid && attr.type === "string") {
            attr.type = DataTypes.UUID;
            attr.defaultValue = DataTypes.UUIDV4;
            delete attr.uuid;
        }

        if (attr.autoIncrement) {
            attr.autoIncrement = true;
        }

        if (attr.unique) {
            attr.unique = true;
        }

        if (typeof attr.type === "string") {
            switch (attr.type) {
                case "string":
                    attr.type = DataTypes.STRING;
                    break;
                case "number":
                    attr.type = DataTypes.INTEGER;
                    break;
                case "boolean":
                    attr.type = DataTypes.BOOLEAN;
                    break;
                case "json":
                    attr.type = DataTypes.JSON;
                    break;
                case "ref":
                    attr.type = DataTypes.JSON;
                    break;
                case "datetime":
                case "date":
                    attr.type = DataTypes.DATE;
                    break;
                default:
                    throw new Error(`Unrecognized datatype "${attr.type}" for field "${field}" in model "${modelName}"`);
            }
        }

        attributes[field] = attr;
    }

    if (!primaryKey) {
        throw new Error(`Model "${modelName}" must have a primary key`);
    }

    return sequelize.define(modelName, attributes, {
        tableName: modelName.toLowerCase(),
        timestamps: true,
    });
}
