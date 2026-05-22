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
import {AbstractAdapter, AbstractModel, Attribute, FindOptions} from "../AbstractModel";
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

                model.belongsTo(targetModel, {
                    as: asName,
                    foreignKey,
                });
            }
        }
    }
}

function resolveType(type: any): Attribute["type"] {
    const sqlType = typeof type.toString === "function"
        ? type.toString().toLowerCase()
        : "";
    if (sqlType.includes("string") || sqlType.includes("uuid")) return "string";
    if (sqlType.includes("int") || sqlType.includes("float") || sqlType.includes("decimal")) return "number";
    if (sqlType.includes("bool")) return "boolean";
    if (sqlType.includes("json")) return "json";
    if (sqlType.includes("date")) return "string";
    return "ref";
}

export function mapSequelizeToWaterline(model: ModelStatic<any>): Record<string, Attribute> {
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
            mapSequelizeToWaterline(model),
            model.primaryKeyAttribute,
            model.name
        );
        this.model = model;
    }


    _convertCriteriaToSequelize(criteria: any): any {
        const result: Record<string, any> = {};

        for (const key in criteria) {
            const value = criteria[key];

            if (
                value === undefined ||
                (typeof value === "object" && value !== null && Object.keys(value).length === 0)
            ) {
                continue;
            }
            // 🧠 Replace the key with `via` if this is an association
            const attr = this.attributes?.[key];
            let targetKey = key;
            if (attr?.type === "association" && attr.via) {
                targetKey = attr.via;
            }

            if (value === null) {
                result[targetKey] = {[Op.is]: null};
            } else if (Array.isArray(value)) {
                // ✅ Array processing - use the IN operator
                result[targetKey] = {[Op.in]: value};
            } else if (typeof value === "object" && !Array.isArray(value)) {
                const operatorEntries = Object.entries(value)
                    .filter(([_, v]) => v !== undefined && v !== null)
                    .map(([op, val]) => {
                        switch (op) {
                            case "contains":
                                return [Op.like, `%${val}%`];
                            case "startsWith":
                                return [Op.startsWith, val];
                            case "endsWith":
                                return [Op.endsWith, val];
                            case ">":
                                return [Op.gt, val];
                            case ">=":
                                return [Op.gte, val];
                            case "<":
                                return [Op.lt, val];
                            case "<=":
                                return [Op.lte, val];
                            case "!=":
                                return [Op.ne, val];
                            case "in":
                                return [Op.in, val];
                            case "nin":
                                return [Op.notIn, val];
                            default:
                                return [Op.eq, val];
                        }
                    });

                if (operatorEntries.length > 0) {
                    result[targetKey] = Object.fromEntries(operatorEntries);
                }
            } else {
                result[targetKey] = value;
            }
        }

        return result;
    }


    _convertWaterlineCriteriaToSequelizeOptions(criteria: any): {
        where?: any;
        limit?: number;
        offset?: number;
        order?: any[];
    } {
        // console.debug("WATERLINE CRITERIA (raw):", criteria);


        const {where: nestedWhere, skip, limit, sort, ...rest} = criteria;


        const rawWhere = (nestedWhere && Object.keys(nestedWhere).length > 0)
            ? nestedWhere
            : rest;

        // console.debug("WATERLINE CRITERIA: using rawWhere =", rawWhere);


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
        if (typeof sort === "string") {
            const [field, dir] = sort.trim().split(/\s+/);
            result.order = [[field, dir?.toUpperCase() === "DESC" ? "DESC" : "ASC"]];
            // console.debug("→ order =", result.order);
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

        console.debug(">> Normal fields for create():", JSON.stringify(plainData));
        console.debug(">> Association data:", JSON.stringify(assocData));


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
    protected async _findOne(criteria: Partial<T>): Promise<T | null> {
        // console.debug(">> _findOne: input criteria:", criteria);

        const {where} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);
        const includes = this._buildIncludes();
        // console.debug(">> _findOne: converted where:", where);
        // console.debug(">> _findOne: includes:", includes);

        let instance = null;
        try {
            instance = await this.model.findOne({where, include: includes});
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
        criteria: Partial<T> = {},
        options: FindOptions = {}
    ): Promise<T[]> {
        const assocNames = Object.keys(this.model.associations);
        // console.debug(">> _find: input criteria:", criteria, "options:", options);

        const {where, limit, offset, order} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);
        const includes = options.populate
            ? options.populate.map(([field, opts]) => ({association: field, ...opts}))
            : assocNames.map(a => ({association: a}));

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
            limit,
            offset,
            order,
            include: includes
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

    // --- UPDATE ONE ---
    protected async _updateOne(criteria: Partial<T>, data: Partial<T>): Promise<T | null> {
        const {where} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);

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
    protected async _update(criteria: Partial<T>, data: Partial<T>): Promise<T[]> {
        const {where} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);

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
    protected async _destroyOne(criteria: Partial<T>): Promise<T | null> {
        const {where} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);
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
    protected async _destroy(criteria: Partial<T>): Promise<T[]> {
        const {where} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);

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
    protected async _count(criteria: Partial<T> = {}): Promise<number> {
        const {where} = this._convertWaterlineCriteriaToSequelizeOptions(criteria);

        const result = await this.model.count({where});

        return result;
    }

    // --- HELPER ---
    private _buildIncludes(): IncludeOptions[] {
        return Object.keys(this.model.associations).map(key => ({association: key}));
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

/**Generation of the SEQUELIZE model from the definition, analogue of Waterinecollection.extenD*/
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
