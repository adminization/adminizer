import {
    Brackets,
    DataSource,
    EntityMetadata,
    EntitySchema,
    NotBrackets,
    ObjectLiteral,
    Repository,
    SelectQueryBuilder,
} from "typeorm";
import { v4 as uuid } from "uuid";
import { AbstractAdapter, AbstractAdapterOptions, AbstractModel, Attribute, ModelAttributes } from "../AbstractModel";
import { CriteriaPopulate, CriteriaSelect, QueryCriteria } from "../../../interfaces/queryCriteria";

/**
 * Experimental TypeORM adapter.
 *
 * This implementation is intentionally kept isolated from the core runtime and fixture wiring.
 * It has not been validated in production yet; Sequelize remains the primary and recommended
 * adapter for real projects until TypeORM coverage is expanded through runtime testing.
 */
type AdminizerSchema = Record<string, any>;
type TypeOrmEntity = Function | string | EntitySchema;

const ROOT_ALIAS = "record";

function normalizeModelName(modelName: string): string {
    return modelName.toLowerCase();
}

function getSchemaFieldName(attr: Record<string, any>, fallback: string): string {
    return attr.field || attr.columnName || fallback;
}

function resolveAdminizerTypeFromColumn(column: any): Attribute["type"] {
    const type = typeof column.type === "function"
        ? column.type.name.toLowerCase()
        : String(column.type ?? "").toLowerCase();

    if (type.includes("bool")) return "boolean";
    if (
        type.includes("int") ||
        type.includes("float") ||
        type.includes("double") ||
        type.includes("decimal") ||
        type.includes("number")
    ) {
        return "number";
    }
    if (type.includes("json")) return "json";
    if (type.includes("date") || type.includes("time")) return "date";
    if (type.includes("char") || type.includes("text") || type.includes("uuid") || type.includes("string")) {
        return "string";
    }

    return "ref";
}

function resolveTypeOrmColumnType(attr: Record<string, any>): string {
    if (attr.autoCreatedAt || attr.autoUpdatedAt || attr.type === "datetime" || attr.type === "date") {
        return "datetime";
    }

    switch (attr.type) {
        case "number":
            return "integer";
        case "boolean":
            return "boolean";
        case "json":
        case "ref":
            return "simple-json";
        case "datetime":
        case "date":
            return "datetime";
        case "string":
        default:
            return "varchar";
    }
}

function getPrimaryColumnType(metadata: EntityMetadata): Attribute["type"] {
    const primary = metadata.primaryColumns[0];
    return primary ? resolveAdminizerTypeFromColumn(primary) : "ref";
}

function getPrimaryKeyValue<T extends ObjectLiteral>(record: T, primaryKey: string): unknown {
    return record?.[primaryKey];
}

function normalizeRelationValue(value: unknown, primaryKey: string): unknown {
    if (value && typeof value === "object") {
        return (value as Record<string, unknown>)[primaryKey] ?? value;
    }
    return value;
}

function mapRelationType(relationType: string): Attribute["type"] {
    return relationType === "one-to-many" || relationType === "many-to-many"
        ? "association-many"
        : "association";
}

export function mapTypeOrmToAdminizerAttributes(metadata: EntityMetadata): ModelAttributes {
    const result: ModelAttributes = {};

    for (const column of metadata.columns) {
        result[column.propertyName] = {
            type: resolveAdminizerTypeFromColumn(column),
            required: !column.isNullable,
            allowNull: column.isNullable,
            unique: Boolean((column as any).isUnique),
            defaultsTo: column.default,
            columnName: column.databaseName,
        };
    }

    for (const relation of metadata.relations) {
        const targetName = relation.inverseEntityMetadata.name;
        const relationType = mapRelationType(relation.relationType);

        if (relationType === "association") {
            const joinColumn = relation.joinColumns[0];
            const via = joinColumn?.propertyName || joinColumn?.databaseName || `${relation.propertyName}Id`;

            if (!result[via]) {
                result[via] = {
                    type: getPrimaryColumnType(relation.inverseEntityMetadata),
                    primaryKeyForAssociation: true,
                    columnName: joinColumn?.databaseName || via,
                };
            } else {
                result[via].primaryKeyForAssociation = true;
            }

            result[relation.propertyName] = {
                type: "association",
                model: targetName,
                via,
            };
        } else {
            result[relation.propertyName] = {
                type: "association-many",
                collection: targetName,
                via: relation.inverseRelation?.propertyName || relation.inverseSidePropertyPath,
            };
        }
    }

    return result;
}

export function createTypeOrmEntitySchemaFromAdminizerSchema(
    modelName: string,
    schema: AdminizerSchema,
    allSchemas: Record<string, AdminizerSchema>
): EntitySchema {
    const columns: Record<string, any> = {};
    const relations: Record<string, any> = {};
    const schemaWithTimestamps: AdminizerSchema = {
        ...schema,
        ...(schema.createdAt ? {} : {
            createdAt: {
                type: "datetime",
                autoCreatedAt: true,
            },
        }),
        ...(schema.updatedAt ? {} : {
            updatedAt: {
                type: "datetime",
                autoUpdatedAt: true,
            },
        }),
    };

    for (const [field, rawAttr] of Object.entries(schemaWithTimestamps)) {
        const attr = typeof rawAttr === "string" ? { type: rawAttr } : { ...rawAttr };

        if (attr.model || attr.collection) {
            continue;
        }

        const column: Record<string, any> = {
            type: resolveTypeOrmColumnType(attr),
            name: getSchemaFieldName(attr, field),
            nullable: !attr.primaryKey && !attr.required,
        };

        if (attr.primaryKey) {
            column.primary = true;
            column.nullable = false;
        }
        if (attr.autoIncrement) {
            column.generated = "increment";
        }
        if (attr.uuid) {
            column.generated = "uuid";
        }
        if (attr.unique) {
            column.unique = true;
        }
        if (attr.defaultsTo !== undefined) {
            column.default = attr.defaultsTo;
        }
        if (attr.autoCreatedAt) {
            column.createDate = true;
        }
        if (attr.autoUpdatedAt) {
            column.updateDate = true;
        }

        columns[field] = column;
    }

    for (const [field, rawAttr] of Object.entries(schemaWithTimestamps)) {
        const attr = typeof rawAttr === "string" ? { type: rawAttr } : rawAttr;

        if (attr.model) {
            relations[field] = {
                type: "many-to-one",
                target: attr.model,
                joinColumn: {
                    name: `${field}Id`,
                },
                nullable: !attr.required,
                onDelete: attr.onDelete,
            };
            continue;
        }

        if (attr.collection && attr.via) {
            const targetSchema = allSchemas[attr.collection];
            const inverse = targetSchema?.[attr.via];
            const isManyToMany = inverse?.collection === modelName;

            if (isManyToMany) {
                const isOwner = normalizeModelName(modelName) > normalizeModelName(attr.collection);
                relations[field] = {
                    type: "many-to-many",
                    target: attr.collection,
                    inverseSide: attr.via,
                    joinTable: isOwner
                        ? {
                            name: [modelName, attr.collection].sort().join("").toLowerCase(),
                            joinColumn: { name: `${modelName}Id` },
                            inverseJoinColumn: { name: `${attr.collection}Id` },
                        }
                        : false,
                };
            } else {
                relations[field] = {
                    type: "one-to-many",
                    target: attr.collection,
                    inverseSide: attr.via,
                };
            }
        }
    }

    return new EntitySchema({
        name: modelName,
        tableName: modelName.toLowerCase(),
        columns,
        relations,
    });
}

export class TypeOrmModel<T extends ObjectLiteral> extends AbstractModel<T> {
    private readonly metadata: EntityMetadata;
    private readonly repository: Repository<T>;
    private paramIndex = 0;

    constructor(modelName: string, metadata: EntityMetadata) {
        super(
            modelName,
            mapTypeOrmToAdminizerAttributes(metadata),
            metadata.primaryColumns[0]?.propertyName || "id",
            metadata.name
        );
        this.metadata = metadata;
        this.repository = metadata.connection.getRepository(metadata.target as TypeOrmEntity) as Repository<T>;
    }

    private nextParamName(): string {
        this.paramIndex += 1;
        return `p${this.paramIndex}`;
    }

    private createQueryBuilder(alias = ROOT_ALIAS): SelectQueryBuilder<T> {
        this.paramIndex = 0;
        return this.repository.createQueryBuilder(alias);
    }

    private get relationNames(): string[] {
        return this.metadata.relations.map((relation) => relation.propertyName);
    }

    private getRelation(name: string) {
        return this.metadata.relations.find((relation) => relation.propertyName === name);
    }

    private getFieldColumn(alias: string, field: string): string {
        const attr = this.attributes[field];
        if (attr?.type === "association" && attr.via) {
            return `${alias}.${attr.via}`;
        }
        return `${alias}.${field}`;
    }

    private getMetadataForAlias(alias: string): EntityMetadata | undefined {
        if (alias === ROOT_ALIAS) {
            return this.metadata;
        }

        const relationPrefix = `${ROOT_ALIAS}_`;
        if (!alias.startsWith(relationPrefix)) {
            return undefined;
        }

        const relationName = alias.slice(relationPrefix.length);
        return this.getRelation(relationName)?.inverseEntityMetadata;
    }

    private getOrderColumn(alias: string, field: string): string | undefined {
        const metadata = this.getMetadataForAlias(alias);
        if (!metadata) {
            return undefined;
        }

        const attr = alias === ROOT_ALIAS ? this.attributes[field] : undefined;
        const normalizedField = attr?.type === "association" && attr.via ? attr.via : field;
        const column = metadata.columns.find((item) =>
            item.propertyName === normalizedField ||
            item.databaseName === normalizedField
        );

        return column ? `${alias}.${column.propertyName}` : undefined;
    }

    private getOrder(criteria: QueryCriteria): Array<[string, "ASC" | "DESC"]> {
        if (!criteria.sort) {
            return [];
        }

        if (typeof criteria.sort === "string") {
            const [field, dir] = criteria.sort.trim().split(/\s+/);
            return [[field, dir?.toUpperCase() === "DESC" ? "DESC" : "ASC"]];
        }

        return Object.entries(criteria.sort).map(([field, dir]) => [
            field,
            String(dir).toUpperCase() === "DESC" ? "DESC" : "ASC",
        ]);
    }

    private buildAttributes(select?: CriteriaSelect): string[] | undefined {
        if (!select) {
            return undefined;
        }

        const validColumns = new Set(this.metadata.columns.map((column) => column.propertyName));
        if (Array.isArray(select)) {
            const fields = select.filter((field) => validColumns.has(field));
            return fields.length ? fields : undefined;
        }

        const fields = Object.entries(select)
            .filter(([field, enabled]) => enabled && validColumns.has(field))
            .map(([field]) => field);

        return fields.length ? fields : undefined;
    }

    private normalizeCriteria(criteria: QueryCriteria = {}): {
        where: Record<string, any> | Brackets | NotBrackets;
        limit?: number;
        skip?: number;
        order: Array<[string, "ASC" | "DESC"]>;
        select?: string[];
    } {
        const criteriaSortValue = "sort" in criteria ? criteria.sort : undefined;
        const isOrderingSort = typeof criteriaSortValue === "string";
        const { where: nestedWhere, skip, limit, sort, select, populate, ...rest } = criteria as any;
        if (!isOrderingSort && criteriaSortValue !== undefined) {
            rest.sort = criteriaSortValue;
        }

        const hasNestedWhereKeys = nestedWhere && Object.keys(nestedWhere).length > 0;
        return {
            where: hasNestedWhereKeys ? nestedWhere : rest,
            limit,
            skip,
            order: this.getOrder(criteria),
            select: this.buildAttributes(select),
        };
    }

    private addRequestedRelations(qb: SelectQueryBuilder<T>, populate?: CriteriaPopulate): Map<string, string> {
        const aliases = new Map<string, string>();
        const relations = populate ? Object.keys(populate) : this.relationNames;

        for (const relationName of relations) {
            if (!this.getRelation(relationName)) {
                continue;
            }
            const alias = `${ROOT_ALIAS}_${relationName}`;
            qb.leftJoinAndSelect(`${ROOT_ALIAS}.${relationName}`, alias);
            aliases.set(relationName, alias);
        }

        if (populate) {
            for (const [relationName, nestedCriteria] of Object.entries(populate)) {
                if (nestedCriteria === true) {
                    continue;
                }

                const alias = aliases.get(relationName);
                if (!alias) {
                    continue;
                }

                const options = this.normalizeCriteria(nestedCriteria);
                if (Object.keys(options.where).length > 0) {
                    this.applyWhere(qb, options.where, alias, aliases);
                }

                for (const [field, direction] of options.order) {
                    const orderColumn = this.getOrderColumn(alias, field);
                    if (orderColumn) {
                        qb.addOrderBy(orderColumn, direction);
                    }
                }
            }
        }

        return aliases;
    }

    private addAllRelationJoins(qb: SelectQueryBuilder<T>): Map<string, string> {
        const aliases = new Map<string, string>();
        for (const relationName of this.relationNames) {
            const alias = `${ROOT_ALIAS}_${relationName}`;
            if (!aliases.has(relationName)) {
                qb.leftJoinAndSelect(`${ROOT_ALIAS}.${relationName}`, alias);
                aliases.set(relationName, alias);
            }
        }
        return aliases;
    }

    private isNativeWhere(where: unknown): where is Brackets | NotBrackets {
        return where instanceof Brackets || where instanceof NotBrackets;
    }

    private applyFindOptions(qb: SelectQueryBuilder<T>, criteria: QueryCriteria): void {
        const options = this.normalizeCriteria(criteria);
        const aliases = this.addRequestedRelations(qb, criteria.populate);

        if (this.isNativeWhere(options.where) || Object.keys(options.where).length > 0) {
            this.applyWhere(qb, options.where, ROOT_ALIAS, aliases);
        }
        if (options.select) {
            qb.select(options.select.map((field) => `${ROOT_ALIAS}.${field}`));
        }
        for (const [field, direction] of options.order) {
            const orderColumn = this.getOrderColumn(ROOT_ALIAS, field);
            if (orderColumn) {
                qb.addOrderBy(orderColumn, direction);
            }
        }
        if (typeof options.skip === "number") {
            qb.skip(options.skip);
        }
        if (typeof options.limit === "number") {
            qb.take(options.limit);
        }
    }

    private applyWhere(
        qb: SelectQueryBuilder<T>,
        where: Record<string, any> | Brackets | NotBrackets,
        alias: string,
        relationAliases: Map<string, string>
    ): void {
        if (this.isNativeWhere(where)) {
            qb.andWhere(where);
            return;
        }

        const brackets = this.buildWhereBrackets(where, alias, relationAliases);
        if (brackets) {
            qb.andWhere(brackets);
        }
    }

    private buildWhereBrackets(
        where: Record<string, any>,
        alias: string,
        relationAliases: Map<string, string>
    ): Brackets | undefined {
        const entries = Object.entries(where).filter(([, value]) => value !== undefined);
        if (!entries.length) {
            return undefined;
        }

        return new Brackets((builder) => {
            entries.forEach(([key, value], index) => {
                const expression = this.buildWhereExpression(key, value, alias, relationAliases);
                if (!expression) {
                    return;
                }
                if (index === 0) {
                    builder.where(expression.sql as any, expression.params);
                } else {
                    builder.andWhere(expression.sql as any, expression.params);
                }
            });
        });
    }

    private buildWhereExpression(
        key: string,
        value: any,
        alias: string,
        relationAliases: Map<string, string>
    ): { sql: string | Brackets; params?: Record<string, unknown> } | undefined {
        if (key === "and") {
            const items = Array.isArray(value) ? value : [];
            return {
                sql: new Brackets((builder) => {
                    items.forEach((item, index) => {
                        const bracket = this.buildWhereBrackets(item, alias, relationAliases);
                        if (!bracket) return;
                        index === 0 ? builder.where(bracket) : builder.andWhere(bracket);
                    });
                }),
            };
        }

        if (key === "or") {
            const items = Array.isArray(value) ? value : [];
            return {
                sql: new Brackets((builder) => {
                    items.forEach((item, index) => {
                        const bracket = this.buildWhereBrackets(item, alias, relationAliases);
                        if (!bracket) return;
                        index === 0 ? builder.where(bracket) : builder.orWhere(bracket);
                    });
                }),
            };
        }

        if (key === "not") {
            const bracket = this.buildWhereBrackets(value, alias, relationAliases);
            if (!bracket) return undefined;
            return {
                sql: new NotBrackets((builder) => builder.where(bracket)),
            };
        }

        const relationPathMatch = key.match(/^\$([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\$$/);
        if (relationPathMatch) {
            const relationAlias = relationAliases.get(relationPathMatch[1]);
            if (!relationAlias) {
                return undefined;
            }
            return this.buildFieldCondition(`${relationAlias}.${relationPathMatch[2]}`, value);
        }

        const attr = this.attributes[key];
        if (attr?.type === "association-many") {
            const relationAlias = relationAliases.get(key);
            const relation = this.getRelation(key);
            const targetPrimaryKey = relation?.inverseEntityMetadata.primaryColumns[0]?.propertyName || "id";
            if (relationAlias) {
                return this.buildFieldCondition(`${relationAlias}.${targetPrimaryKey}`, value);
            }
        }

        return this.buildFieldCondition(this.getFieldColumn(alias, key), value);
    }

    private buildFieldCondition(
        column: string,
        value: any
    ): { sql: string; params?: Record<string, unknown> } | undefined {
        if (value === null) {
            return { sql: `${column} IS NULL` };
        }

        if (Array.isArray(value)) {
            const param = this.nextParamName();
            return { sql: `${column} IN (:...${param})`, params: { [param]: value } };
        }

        if (value && typeof value === "object" && !(value instanceof Date)) {
            const expressions: string[] = [];
            const params: Record<string, unknown> = {};

            for (const [operator, raw] of Object.entries(value)) {
                if (raw === undefined) continue;
                const built = this.buildOperatorCondition(column, operator, raw);
                if (!built) continue;
                expressions.push(built.sql);
                Object.assign(params, built.params);
            }

            if (!expressions.length) {
                return undefined;
            }

            return {
                sql: expressions.length === 1 ? expressions[0] : expressions.map((item) => `(${item})`).join(" AND "),
                params,
            };
        }

        const param = this.nextParamName();
        return { sql: `${column} = :${param}`, params: { [param]: value } };
    }

    private buildOperatorCondition(
        column: string,
        operator: string,
        value: unknown
    ): { sql: string; params?: Record<string, unknown> } | undefined {
        const param = this.nextParamName();
        const params = { [param]: value };

        switch (operator) {
            case "eq":
            case "$eq":
                return { sql: `${column} = :${param}`, params };
            case "ne":
            case "!=":
            case "$ne":
                return { sql: `${column} != :${param}`, params };
            case "gt":
            case ">":
            case "$gt":
                return { sql: `${column} > :${param}`, params };
            case "gte":
            case ">=":
            case "$gte":
                return { sql: `${column} >= :${param}`, params };
            case "lt":
            case "<":
            case "$lt":
                return { sql: `${column} < :${param}`, params };
            case "lte":
            case "<=":
            case "$lte":
                return { sql: `${column} <= :${param}`, params };
            case "contains":
                return { sql: `CAST(${column} AS TEXT) LIKE :${param}`, params: { [param]: `%${value}%` } };
            case "startsWith":
                return { sql: `CAST(${column} AS TEXT) LIKE :${param}`, params: { [param]: `${value}%` } };
            case "endsWith":
                return { sql: `CAST(${column} AS TEXT) LIKE :${param}`, params: { [param]: `%${value}` } };
            case "in":
            case "$in":
                return { sql: `${column} IN (:...${param})`, params };
            case "notIn":
            case "nin":
            case "$notIn":
                return { sql: `${column} NOT IN (:...${param})`, params };
            case "between":
            case "$between": {
                const [from, to] = Array.isArray(value) ? value : [undefined, undefined];
                const fromParam = `${param}From`;
                const toParam = `${param}To`;
                return {
                    sql: `${column} BETWEEN :${fromParam} AND :${toParam}`,
                    params: { [fromParam]: from, [toParam]: to },
                };
            }
            case "isNull":
                return value ? { sql: `${column} IS NULL` } : undefined;
            case "isNotNull":
                return value ? { sql: `${column} IS NOT NULL` } : undefined;
            case "jsonContains": {
                const serialized = JSON.stringify(value).replace(/[%_]/g, "\\$&");
                return { sql: `CAST(${column} AS TEXT) LIKE :${param}`, params: { [param]: `%${serialized}%` } };
            }
            default:
                return undefined;
        }
    }

    private splitData(data: Record<string, any>): {
        plainData: Record<string, any>;
        manyRelationData: Record<string, any>;
    } {
        const plainData: Record<string, any> = {};
        const manyRelationData: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            const relation = this.getRelation(key);
            if (!relation) {
                plainData[key] = value;
                continue;
            }

            if (relation.isManyToMany || relation.isOneToMany) {
                manyRelationData[key] = value;
                continue;
            }

            const primaryKey = relation.inverseEntityMetadata.primaryColumns[0]?.propertyName || "id";
            plainData[key] = value === null || value === undefined
                ? value
                : { [primaryKey]: normalizeRelationValue(value, primaryKey) };
        }

        return { plainData, manyRelationData };
    }

    private async assignManyRelations(entity: T, relationData: Record<string, any>): Promise<T> {
        let shouldSaveEntity = false;

        for (const [key, value] of Object.entries(relationData)) {
            const relation = this.getRelation(key);
            if (!relation) {
                continue;
            }

            if (relation.isOneToMany) {
                await this.assignOneToManyRelation(entity, key, value);
                continue;
            }

            if (!relation.isManyToMany) {
                continue;
            }

            const primaryKey = relation.inverseEntityMetadata.primaryColumns[0]?.propertyName || "id";
            (entity as Record<string, any>)[key] = Array.isArray(value)
                ? value.map((item) => ({ [primaryKey]: normalizeRelationValue(item, primaryKey) }))
                : [];
            shouldSaveEntity = true;
        }

        return shouldSaveEntity ? this.repository.save(entity) : entity;
    }

    private async assignOneToManyRelation(entity: T, relationName: string, value: unknown): Promise<void> {
        const relation = this.getRelation(relationName);
        const inverseRelation = relation?.inverseRelation;
        if (!relation || !inverseRelation) {
            return;
        }

        const parentId = getPrimaryKeyValue(entity, this.primaryKey);
        const targetPrimaryKey = relation.inverseEntityMetadata.primaryColumns[0]?.propertyName || "id";
        const inverseProperty = inverseRelation.propertyName;
        const targetRepository = this.metadata.connection.getRepository(relation.inverseEntityMetadata.target as TypeOrmEntity);
        const selectedIds = Array.isArray(value)
            ? value
                .map((item) => normalizeRelationValue(item, targetPrimaryKey))
                .filter((item) => item !== undefined && item !== null && item !== "")
            : [];
        const selectedIdSet = new Set(selectedIds.map((item) => String(item)));

        const currentChildren = await targetRepository
            .createQueryBuilder("target")
            .leftJoin(`target.${inverseProperty}`, "parent")
            .where(`parent.${this.primaryKey} = :parentId`, { parentId })
            .getMany();

        const childrenToClear = currentChildren.filter((child) =>
            !selectedIdSet.has(String((child as Record<string, unknown>)[targetPrimaryKey]))
        );

        for (const child of childrenToClear) {
            (child as Record<string, unknown>)[inverseProperty] = null;
            await targetRepository.save(child);
        }

        if (!selectedIds.length) {
            return;
        }

        const selectedChildren = await targetRepository
            .createQueryBuilder("target")
            .where(`target.${targetPrimaryKey} IN (:...ids)`, { ids: selectedIds })
            .getMany();

        for (const child of selectedChildren) {
            (child as Record<string, unknown>)[inverseProperty] = { [this.primaryKey]: parentId };
            await targetRepository.save(child);
        }
    }

    private async reloadByPrimaryKey(entity: T): Promise<T> {
        const primaryValue = getPrimaryKeyValue(entity, this.primaryKey);
        const qb = this.createQueryBuilder();
        this.addAllRelationJoins(qb);
        qb.where(`${ROOT_ALIAS}.${this.primaryKey} = :id`, { id: primaryValue });
        return await qb.getOne() as T;
    }

    protected async _create(data: Record<string, any>): Promise<T> {
        const { plainData, manyRelationData } = this.splitData(data);

        if (!plainData[this.primaryKey]) {
            const primary = this.metadata.primaryColumns[0];
            if (primary && resolveAdminizerTypeFromColumn(primary) === "string" && !primary.isGenerated) {
                plainData[this.primaryKey] = uuid();
            }
        }

        let entity = this.repository.create(plainData as any) as unknown as T;
        entity = await this.repository.save(entity);
        if (Object.keys(manyRelationData).length > 0) {
            entity = await this.assignManyRelations(entity, manyRelationData);
        }

        return await this.reloadByPrimaryKey(entity);
    }

    protected async _findOne(criteria: QueryCriteria = {}): Promise<T | null> {
        const qb = this.createQueryBuilder();
        this.applyFindOptions(qb, criteria);
        return await qb.getOne();
    }

    protected async _find(criteria: QueryCriteria = {}): Promise<T[]> {
        const qb = this.createQueryBuilder();
        this.applyFindOptions(qb, criteria);
        return await qb.getMany();
    }

    protected async _updateOne(criteria: QueryCriteria, data: Partial<T>): Promise<T | null> {
        const record = await this._findOne(criteria);
        if (!record) {
            return null;
        }

        const { plainData, manyRelationData } = this.splitData(data as Record<string, any>);
        this.repository.merge(record, plainData as any);
        let saved = await this.repository.save(record);
        if (Object.keys(manyRelationData).length > 0) {
            saved = await this.assignManyRelations(saved, manyRelationData);
        }

        return await this.reloadByPrimaryKey(saved);
    }

    protected async _update(criteria: QueryCriteria, data: Partial<T>): Promise<T[]> {
        const records = await this._find(criteria);
        const updated: T[] = [];

        for (const record of records) {
            const updatedRecord = await this._updateOne({ where: { [this.primaryKey]: record[this.primaryKey] } }, data);
            if (updatedRecord) {
                updated.push(updatedRecord);
            }
        }

        return updated;
    }

    protected async _destroyOne(criteria: QueryCriteria): Promise<T | null> {
        const record = await this._findOne(criteria);
        if (!record) {
            return null;
        }

        await this.repository.remove(record);
        return record;
    }

    protected async _destroy(criteria: QueryCriteria): Promise<T[]> {
        const records = await this._find(criteria);
        if (!records.length) {
            return [];
        }

        await this.repository.remove(records);
        return records;
    }

    protected async _count(criteria: QueryCriteria = {}): Promise<number> {
        const qb = this.createQueryBuilder();
        const options = this.normalizeCriteria(criteria);
        const aliases = this.addRequestedRelations(qb, criteria.populate);
        if (this.isNativeWhere(options.where) || Object.keys(options.where).length > 0) {
            this.applyWhere(qb, options.where, ROOT_ALIAS, aliases);
        }
        return await qb.getCount();
    }
}

export class TypeOrmAdapter extends AbstractAdapter {
    public dataSource: DataSource;
    public Model = TypeOrmModel;

    constructor(dataSource: DataSource, options: AbstractAdapterOptions = {}) {
        super("typeorm", dataSource, options);
        this.dataSource = dataSource;
    }

    get models(): Record<string, EntityMetadata> {
        return this.dataSource.entityMetadatas.reduce<Record<string, EntityMetadata>>((acc, metadata) => {
            acc[metadata.name] = metadata;
            return acc;
        }, {});
    }

    getModel(modelName: string): EntityMetadata | undefined {
        return this.dataSource.entityMetadatas.find((metadata) =>
            metadata.name.toLowerCase() === modelName.toLowerCase() ||
            metadata.tableName.toLowerCase() === modelName.toLowerCase()
        );
    }

    getAttributes(modelName: string): ModelAttributes | undefined {
        const model = this.getModel(modelName);
        return model ? mapTypeOrmToAdminizerAttributes(model) : undefined;
    }

    static createEntitySchema(
        modelName: string,
        schema: AdminizerSchema,
        allSchemas: Record<string, AdminizerSchema> = { [modelName]: schema }
    ): EntitySchema {
        return createTypeOrmEntitySchemaFromAdminizerSchema(modelName, schema, allSchemas);
    }

}
