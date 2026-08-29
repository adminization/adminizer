import type {
    ModelStatic,
    IncludeOptions,
    Op,
    HasMany,
    BelongsTo,
    BelongsToMany,
    HasOne,
    Sequelize as SequelizeType,
} from "sequelize";
import {AbstractAdapter, AbstractAdapterOptions, AbstractModel, Attribute, GraphSubqueryLevel} from "../AbstractModel";
import { CriteriaPopulate, CriteriaSelect, QueryCriteria } from "../../../interfaces/queryCriteria";
import { Adminizer } from "../../Adminizer";

let _Sequelize: typeof SequelizeType | null = null;
let _Op: typeof Op | null = null;
let _HasMany: typeof HasMany | null = null;

async function ensureSequelize(): Promise<typeof SequelizeType> {
    if (_Sequelize) return _Sequelize;
    const sequelize = await import('sequelize');
    _Sequelize = sequelize.Sequelize;
    _Op = sequelize.Op;
    _HasMany = sequelize.HasMany;
    return _Sequelize;
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
    // Sequelize renders temporal types per dialect: sqlite gives DATETIME/DATE,
    // postgres TIMESTAMP WITH TIME ZONE, mysql DATETIME/TIMESTAMP. Match all of them.
    if (sqlType.includes("date") || sqlType.includes("time")) return "date";
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
                markAssociationForeignKey(result, a.foreignKey);
                result[alias] = {
                    type: "association",
                    model: a.target.name,
                    via: a.foreignKey as string,
                };
                break;
            }
            case "HasOne": {
                const a = assoc as HasOne;
                markAssociationForeignKey(result, a.foreignKey);
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

function markAssociationForeignKey(
    attributes: Record<string, Attribute>,
    foreignKey: unknown,
): void {
    if (typeof foreignKey === "string" && attributes[foreignKey]) {
        attributes[foreignKey].primaryKeyForAssociation = true;
    }
}

type AbstractFieldType =
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "date"
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
    private _init = false;

    private async _ensure(): Promise<void> {
        if (!this._init) {
            await ensureSequelize();
            this._init = true;
        }
    }

    constructor(modelName: string, model: ModelStatic<any>) {
        super(
            modelName,
            mapSequelizeToAdminizerAttributes(model),
            model.primaryKeyAttribute,
            model.name
        );
        this.model = model;
    }

    /**
     * accessGraph pushdown: compiles the level chain into one nested-subquery literal for
     * an `{in: ...}` criteria, so the DB planner optimizes the whole walk instead of the
     * app materializing id lists. Returns undefined — falling back to materialization —
     * when any level lives on another adapter or connection, an attribute is unknown, or a
     * level carries a defaultScope we cannot reproduce.
     *
     * The materialized path queries through `model.find()`, so it inherits paranoid and
     * defaultScope filtering; this raw SQL must match it exactly or the same config would
     * yield two different record sets depending on `pushdown`.
     *
     * Every bail-out reports through `decline` before returning: a fallback is invisible in the
     * result (the records are the same, only slower), so the reason is the only thing that tells
     * an operator why `pushdown: true` changed nothing.
     */
    public async compileGraphInSubquery(
        levels: GraphSubqueryLevel[],
        decline?: (reason: string) => void,
    ): Promise<unknown | undefined> {
        await this._ensure();

        /** Reports the reason and bails out of the whole compilation. */
        const no = (reason: string): undefined => {
            decline?.(reason);
            return undefined;
        };

        const targets: ModelStatic<any>[] = [];
        for (const level of levels) {
            if (!(level.model instanceof SequelizeModel)) {
                return no(`"${level.model.modelname}" is not a Sequelize model`);
            }
            const target = (level.model as SequelizeModel<any>).model;
            if (!target.sequelize || target.sequelize !== this.model.sequelize) {
                return no(`"${level.model.modelname}" lives on another Sequelize connection`);
            }
            targets.push(target);
        }

        const queryGenerator = (this.model.sequelize!.getQueryInterface() as any).queryGenerator;

        // Adminizer attribute (association alias or plain column) → quoted physical column
        const columnFor = (levelModel: AbstractModel<any>, target: ModelStatic<any>, attributeName: string): string | undefined => {
            const attribute = levelModel.attributes?.[attributeName];
            const rawName = (attribute?.type === "association" && attribute.via) ? attribute.via : attributeName;
            const raw = target.rawAttributes?.[rawName];
            if (!raw) {
                return undefined;
            }
            return queryGenerator.quoteIdentifier(raw.field ?? rawName);
        };

        let sql: string | undefined;
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const target = targets[i];
            const table = queryGenerator.quoteTable(target.getTableName());

            const selectColumn = columnFor(level.model, target, level.select);
            if (!selectColumn) {
                return no(`"${level.model.modelname}.${level.select}" has no column to select`);
            }

            const modelOptions: any = (target as any).options ?? {};
            // A defaultScope silently narrows every findAll on the model; reproducing an
            // arbitrary one in raw SQL is not possible, so this chain is not pushed down.
            if (modelOptions.defaultScope && Object.keys(modelOptions.defaultScope).length) {
                return no(
                    `"${level.model.modelname}" declares a defaultScope, which raw SQL cannot reproduce `
                    + `(pushing down would return a different record set than the materialized walk)`
                );
            }

            // Conditions that constrain the level (parent link / literal ids) versus guards that
            // only exclude rows (paranoid). A level constrained by guards alone is NOT narrowed,
            // so the emptiness check below must look at linkConditions only.
            const linkConditions: string[] = [];
            const guardConditions: string[] = [];

            if (modelOptions.paranoid) {
                const deletedAtAttribute = (target as any)._timestampAttributes?.deletedAt
                    ?? modelOptions.deletedAt
                    ?? "deletedAt";
                const rawDeletedAt = target.rawAttributes?.[deletedAtAttribute];
                if (!rawDeletedAt) {
                    return no(
                        `"${level.model.modelname}" is paranoid but its "${deletedAtAttribute}" column cannot be `
                        + `resolved, so soft-deleted rows could not be excluded`
                    );
                }
                const deletedAtColumn = queryGenerator.quoteIdentifier(rawDeletedAt.field ?? deletedAtAttribute);
                guardConditions.push(`${table}.${deletedAtColumn} IS NULL`);
            }

            if (level.parentAttribute) {
                if (!sql) {
                    return no(`"${level.model.modelname}" links to an inner level that produced no subquery`);
                }
                const parentColumn = columnFor(level.model, target, level.parentAttribute);
                if (!parentColumn) {
                    return no(`"${level.model.modelname}.${level.parentAttribute}" has no column to link on`);
                }
                linkConditions.push(`${table}.${parentColumn} IN ${sql}`);
            }
            for (const condition of level.conditions ?? []) {
                const column = columnFor(level.model, target, condition.attribute);
                if (!column) {
                    return no(`"${level.model.modelname}.${condition.attribute}" has no column to filter on`);
                }
                if (!condition.values.length) {
                    linkConditions.push("1 = 0");
                    continue;
                }
                const escaped = condition.values.map((value) => queryGenerator.escape(value)).join(", ");
                linkConditions.push(`${table}.${column} IN (${escaped})`);
            }
            if (!linkConditions.length) {
                return no(`"${level.model.modelname}" has nothing to narrow it — the level would select every row`);
            }

            const conditions = [...linkConditions, ...guardConditions];
            sql = `(SELECT ${table}.${selectColumn} FROM ${table} WHERE ${conditions.join(" AND ")})`;
        }

        return sql ? _Sequelize!.literal(sql) : undefined;
    }

    private _buildJsonContainsCondition(targetKey: string, item: unknown): any {
        const pattern = `%${JSON.stringify(item).replace(/[%_]/g, "\\$&")}%`;
        const attribute = this.model.rawAttributes?.[targetKey];
        const columnName = typeof attribute?.field === "string" ? attribute.field : targetKey;

        return _Sequelize.where(
            _Sequelize.cast(_Sequelize.col(`${this.model.name}.${columnName}`), "TEXT"),
            {[_Op.like as any]: pattern}
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
                result[targetKey] = {[_Op.is]: null};
                continue;
            }

            // 🔹 Handle Sequelize Op operators (already in Sequelize format)
            if (key === (_Op.and as any) || key === 'and') {
                result[_Op.and as any] = Array.isArray(value)
                    ? value.map((item: any) => this._convertCriteriaToSequelize(item))
                    : [];
                continue;
            }

            if (key === (_Op.or as any) || key === 'or') {
                result[_Op.or as any] = Array.isArray(value)
                    ? value.map((item: any) => this._convertCriteriaToSequelize(item))
                    : [];
                continue;
            }

            if (key === (_Op.not as any) || key === 'not' || key === '$not') {
                result[_Op.not as any] = this._convertCriteriaToSequelize(value);
                continue;
            }

            // Skip Symbol keys that are not handled above (should not happen, but safety check)
            if (typeof key === 'symbol') {
                continue;
            }

            if (Array.isArray(value)) {
                // ✅ Array processing - use the IN operator
                result[targetKey] = {[_Op.in]: value};
            } else if (typeof value === "object" && !Array.isArray(value)) {
                // Check if value already contains Sequelize Op operators
                // Need to check both string keys and Symbol keys
                const valueKeys = Object.keys(value);
                const valueSymbols = Object.getOwnPropertySymbols(value);


                // Helper function to check if a symbol/op is a Sequelize operator
                const isSequelizeOp = (op: string | symbol): boolean => {
                    // Check direct Symbol equality first
                    if (op === (_Op.gt as any) || op === (_Op.gte as any) || op === (_Op.lt as any) || op === (_Op.lte as any) ||
                        op === (_Op.eq as any) || op === (_Op.ne as any) || op === (_Op.in as any) || op === (_Op.notIn as any) ||
                        op === (_Op.like as any) || op === (_Op.iLike as any) || op === (_Op.between as any) ||
                        op === (_Op.startsWith as any) || op === (_Op.endsWith as any) || op === (_Op.is as any) || op === (_Op.not as any)) {
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
                    if (val === undefined || val === null) {
                        // Access scoping emits `in` lists, so an absent operand must fail
                        // closed (match nothing) rather than silently widen the query.
                        // Other operators keep the historical skip: filter builders rely on it.
                        if (op === "in") {
                            result[targetKey] = {[_Op.in as any]: []};
                        }
                        continue;
                    }

                    switch (op) {
                        case "eq":
                            result[targetKey] = {[_Op.eq as any]: val};
                            break;
                        case "ne":
                            result[targetKey] = {[_Op.ne as any]: val};
                            break;
                        case "gt":
                            result[targetKey] = {[_Op.gt as any]: val};
                            break;
                        case "gte":
                            result[targetKey] = {[_Op.gte as any]: val};
                            break;
                        case "lt":
                            result[targetKey] = {[_Op.lt as any]: val};
                            break;
                        case "lte":
                            result[targetKey] = {[_Op.lte as any]: val};
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
                                    result[targetKey] = {[_Op.eq as any]: dateValue};
                                }
                            } else {
                                // For time fields and non-date fields - use Op.like with wildcards
                                result[targetKey] = {[_Op.like as any]: `%${val}%`};
                            }
                            break;
                        case "startsWith":
                            result[targetKey] = {[_Op.startsWith as any]: val};
                            break;
                        case "endsWith":
                            result[targetKey] = {[_Op.endsWith as any]: val};
                            break;
                        case ">":
                            result[targetKey] = {[_Op.gt as any]: val};
                            break;
                        case ">=":
                            result[targetKey] = {[_Op.gte as any]: val};
                            break;
                        case "<":
                            result[targetKey] = {[_Op.lt as any]: val};
                            break;
                        case "<=":
                            result[targetKey] = {[_Op.lte as any]: val};
                            break;
                        case "!=":
                            result[targetKey] = {[_Op.ne as any]: val};
                            break;
                        case "in":
                            result[targetKey] = {[_Op.in as any]: val};
                            break;
                        case "notIn":
                            result[targetKey] = {[_Op.notIn as any]: val};
                            break;
                        case "nin":
                            result[targetKey] = {[_Op.notIn as any]: val};
                            break;
                        case "between":
                            result[targetKey] = {[_Op.between as any]: val};
                            break;
                        case "intersects":
                            // Emitted only by the (unsupported) collection form of
                            // `userAccessRelation` — fail loudly instead of the default
                            // Op.eq fallback silently producing a wrong query.
                            throw new Error(`Sequelize adapter does not support the "intersects" operator (field "${String(targetKey)}")`);
                        case "isNull":
                            if (val) {
                                result[targetKey] = {[_Op.is as any]: null};
                            }
                            break;
                        case "isNotNull":
                            if (val) {
                                result[targetKey] = {[_Op.not as any]: null};
                            }
                            break;
                        case "regex":
                            result[targetKey] = {[_Op.regexp as any]: val};
                            break;
                        case "jsonContains": {
                            const values = Array.isArray(val) ? val : [val];
                            const clauses = values.map((item) => this._buildJsonContainsCondition(targetKey as string, item));
                            result[_Op.and as any] = [
                                ...(result[_Op.and as any] ?? []),
                                ...clauses
                            ];
                            break;
                        }
                        case "$is":
                            result[targetKey] = {[_Op.is as any]: val};
                            break;
                        case "$not":
                            result[targetKey] = {[_Op.not as any]: val};
                            break;
                        case "$ne":
                            result[targetKey] = {[_Op.ne as any]: val};
                            break;
                        case "not":
                            result[targetKey] = {[_Op.not as any]: val};
                            break;
                        default:
                            result[targetKey] = {[_Op.eq as any]: val};
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

        const {where: nestedWhere, skip, limit, sort: criteriaSort, select, populate, populateOn: _populateOn, ...rest} = criteria;

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
        await this._ensure();
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
        await this._ensure();
        // console.debug(">> _findOne: input criteria:", criteria);

        const {where, attributes} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const includes = criteria.populate
            ? this._buildCriteriaIncludes(criteria.populate)
            : this._buildIncludes();
        this._applyPopulateOn(includes, criteria.populateOn);
        const selectedAttributes = this._ensureForeignKeysSelected(attributes, criteria.populateOn);
        // console.debug(">> _findOne: converted where:", where);
        // console.debug(">> _findOne: includes:", includes);

        let instance = null;
        try {
            instance = await this.model.findOne({where, attributes: selectedAttributes, include: includes});
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
        this._collapsePopulateOn([plain], criteria.populateOn);
        // console.debug(">> _findOne: plain result:", plain);
        return plain;
    }

    // --- FIND MANY ---
    protected async _find(
        criteria: QueryCriteria = {},
    ): Promise<T[]> {
        await this._ensure();
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
        this._applyPopulateOn(includes, criteria.populateOn);
        const selectedAttributes = this._ensureForeignKeysSelected(attributes, criteria.populateOn);

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
            attributes: selectedAttributes,
            limit,
            offset,
            order,
            include: includes,
            subQuery: hasRelationPathCondition ? false : undefined
        });


        // Associations come from the `include` above: sequelize getters never write into
        // dataValues, so calling them here would only cost one query per association per
        // row and change nothing in the result.
        const plain = instances.map(i => i.get({plain: true}) as T);
        this._collapsePopulateOn(plain, criteria.populateOn);
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
        await this._ensure();
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
        await this._ensure();
        const assocNames = Object.keys(this.model.associations);
        const include = assocNames.map((association) => ({association}));

        return await this.model.count({
            where,
            include,
            distinct: true,
            col: this.primaryKey || this.model.primaryKeyAttribute || 'id'
        });
    }

    // --- UPDATE ONE ---
    protected async _updateOne(criteria: QueryCriteria, data: Partial<T>): Promise<T | null> {
        await this._ensure();
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
        await this._ensure();
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


    /**
     * Application-level cascade for the records `ids` identifies, one statement per
     * association instead of a getter plus a delete per related row:
     *
     * - `belongsTo` — the parent is never touched; deleting a task must not delete its project;
     * - `belongsToMany` — only the link rows go, never the far side: those rows are shared
     *   (deleting one post must not delete a tag another post still uses);
     * - `hasOne` / `hasMany` — the children are deleted, which is the actual cascade.
     *
     * Row-level destroy hooks are preserved for targets that declare them.
     */
    private async _cascadeDelete(ids: unknown[]): Promise<void> {
        if (!ids.length) {
            return;
        }

        for (const alias of Object.keys(this.model.associations)) {
            const assoc = this.model.associations[alias] as any;
            if (assoc.associationType === "BelongsTo") {
                continue;
            }

            const foreignKey = typeof assoc.foreignKey === "string" ? assoc.foreignKey : undefined;
            if (!foreignKey) {
                continue;
            }

            // Many-to-many: the link rows live in the through model, the targets are shared
            const target = assoc.associationType === "BelongsToMany"
                ? assoc.through?.model
                : assoc.target;
            if (!target?.destroy) {
                continue;
            }

            try {
                const hasRowHooks = typeof target.hasHook === "function"
                    && (target.hasHook("beforeDestroy") || target.hasHook("afterDestroy"));
                await target.destroy({
                    where: {[foreignKey]: {[_Op.in as any]: ids}},
                    individualHooks: hasRowHooks,
                });
            } catch (e) {
                Adminizer.log.error(`Failed to cascade the deletion of "${this.modelname}.${alias}"`, e);
            }
        }
    }

    // --- DESTROY ONE ---
    protected async _destroyOne(criteria: QueryCriteria): Promise<T | null> {
        await this._ensure();
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const record = await this.model.findOne({where});

        if (!record) return null;

        await this._cascadeDelete([record.get(this.model.primaryKeyAttribute)]);

        const raw = record.get({plain: true});
        await record.destroy();

        return raw;
    }


    // --- DESTROY MANY ---
    protected async _destroy(criteria: QueryCriteria): Promise<T[]> {
        await this._ensure();
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);

        const records = await this.model.findAll({where});

        await this._cascadeDelete(records.map((r: any) => r.get(this.model.primaryKeyAttribute)));

        const raw = records.map((r: any) => r.get({plain: true}));
        await this.model.destroy({where});

        return raw;
    }


    // --- COUNT ---
    protected async _count(criteria: QueryCriteria = {}): Promise<number> {
        const {where} = this._convertAdminizerCriteriaToSequelizeOptions(criteria);
        const assocNames = Object.keys(this.model.associations);
        const include = assocNames.map((association) => ({association}));

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
        const include: IncludeOptions = {association: alias};

        if (!hasRelationPathCondition) {
            return include;
        }

        const association = this.model.associations[alias] as any;
        const isUsedInWhere = usedRelationAliases.has(alias);
        const isHasMany = association instanceof _HasMany || association?.associationType === 'HasMany';

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

    /**
     * `criteria.populateOn` support: BelongsTo only — the owning row keeps its FK
     * column, so a record filtered out of the JOIN can be handed back as that bare value.
     */
    public canPushdownPopulateAccess(association: string): boolean {
        const assoc = this.model.associations[association] as BelongsTo | undefined;
        return Boolean(
            assoc
            && assoc.associationType === "BelongsTo"
            && typeof assoc.foreignKey === "string"
            && this.model.rawAttributes[assoc.foreignKey]
        );
    }

    /** ANDs `criteria.populateOn` into the matching includes' ON clause (LEFT JOIN — owning rows stay). */
    private _applyPopulateOn(includes: IncludeOptions[], populateOn: QueryCriteria["populateOn"]): void {
        if (!populateOn) {
            return;
        }
        for (const [association, on] of Object.entries(populateOn)) {
            const include = includes.find((entry) => entry.association === association);
            if (!include) {
                continue;
            }
            const condition = this._convertCriteriaToSequelize(on);
            if (include.where) {
                // An explicit populate-where keeps filtering the owning rows (INNER JOIN),
                // now matching only records inside the access confinement.
                include.where = {[_Op.and as any]: [include.where, condition]};
            } else {
                include.where = condition;
                include.required = false;
            }
        }
    }

    /** A record filtered out of a `populateOn` JOIN comes back as its bare foreign key. */
    private _collapsePopulateOn(records: unknown[], populateOn: QueryCriteria["populateOn"]): void {
        if (!populateOn) {
            return;
        }
        for (const association of Object.keys(populateOn)) {
            const foreignKey = (this.model.associations[association] as BelongsTo | undefined)?.foreignKey;
            if (typeof foreignKey !== "string") {
                continue;
            }
            for (const record of records as Record<string, unknown>[]) {
                if (record[association] == null && record[foreignKey] != null) {
                    record[association] = record[foreignKey];
                }
            }
        }
    }

    /** The collapse above reads the FK columns — keep them selected under an explicit `select`. */
    private _ensureForeignKeysSelected(attributes: string[] | undefined, populateOn: QueryCriteria["populateOn"]): string[] | undefined {
        if (!attributes || !populateOn) {
            return attributes;
        }
        const result = [...attributes];
        for (const association of Object.keys(populateOn)) {
            const foreignKey = (this.model.associations[association] as BelongsTo | undefined)?.foreignKey;
            if (typeof foreignKey === "string" && !result.includes(foreignKey)) {
                result.push(foreignKey);
            }
        }
        return result;
    }

    private _buildAttributes(select?: CriteriaSelect, rawAttributes: Record<string, unknown> = this.model.rawAttributes): string[] | undefined {
        if (!select) {
            return undefined;
        }

        if (Array.isArray(select)) {
            const attributes = select.filter((field) => rawAttributes?.[field]);
            return attributes.length ? attributes : undefined;
        }

        const attributes = Object.entries(select)
            .filter(([field, enabled]) => enabled && rawAttributes?.[field])
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
                order,
                limit,
            } = this._convertAdminizerCriteriaToSequelizeOptions(nestedCriteria);

            const include: IncludeOptions = {association};
            const targetAttributes = (this.model.associations[association] as any)?.target?.rawAttributes;
            const attributes = this._buildAttributes(nestedCriteria.select, targetAttributes);

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
    public sequelize: SequelizeType;
    public Model = SequelizeModel;

    constructor(sequelize: SequelizeType, options: AbstractAdapterOptions = {}) {
        ensureSequelize();
        super("sequelize", sequelize, options);
        // Note: ensureSequelize is fire-and-forget during construction
        // Methods also call this._ensure() to guarantee initialization
        this.sequelize = sequelize;
    }

    get models(): Record<string, any> {``
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

}
