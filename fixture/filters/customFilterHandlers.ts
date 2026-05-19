import { Sequelize } from 'sequelize';
import { Brackets } from 'typeorm';
import { AbstractCustomFilter, FilterCustomFieldCondition } from '../../dist';

const TYPEORM_ROOT_ALIAS = 'record';

function normalizeSearchValue(value: unknown): string {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (value === null || value === undefined) {
        return '';
    }

    return JSON.stringify(value);
}

function extractJsonPairFilters(rawValue: string): { key?: string; value?: string } {
    const keyMatch = rawValue.match(/"key"\s*:\s*"([^"]+)"/i);
    const valueMatch = rawValue.match(/"value"\s*:\s*"([^"]+)"/i);

    return {
        key: keyMatch?.[1],
        value: valueMatch?.[1],
    };
}

function escapeSql(value: string): string {
    return value.replace(/'/g, "''");
}

function likePattern(value: string): string {
    return `%${value}%`;
}

export class ExampleJsonCustomFilterHandler extends AbstractCustomFilter {
    public readonly name = 'Example JSON text search';
    public readonly description = 'Search by substring in JSON text';
    public readonly inputConfig = {
        query: { placeholder: 'JSON text', type: 'text' as const }
    };

    constructor() {
        super('Example', 'json');
    }

    public buildCondition(value: unknown): FilterCustomFieldCondition {
        const qualifiedJsonColumn = '`Example`.`json`';
        const valueFromInput = typeof value === 'object' && value !== null && !Array.isArray(value)
            ? (value as Record<string, unknown>).query
            : value;
        const originalValue = normalizeSearchValue(valueFromInput);

        if (!originalValue) {
            return { criteria: {} };
        }

        const compactValue = originalValue.replace(/\s+/g, '').replace(/,+$/g, '');
        const pairFilters = extractJsonPairFilters(originalValue);
        const sqlClauses: string[] = [];

        if (pairFilters.key) {
            sqlClauses.push(`json_extract(${qualifiedJsonColumn}, '$.key') LIKE '%${escapeSql(pairFilters.key)}%'`);
        }

        if (pairFilters.value) {
            sqlClauses.push(`json_extract(${qualifiedJsonColumn}, '$.value') LIKE '%${escapeSql(pairFilters.value)}%'`);
        }

        if (sqlClauses.length > 0) {
            return {
                criteria: Sequelize.literal(sqlClauses.join(' AND '))
            };
        }

        return {
            criteria: Sequelize.literal(
                `(CAST(${qualifiedJsonColumn} AS TEXT) LIKE '%${escapeSql(originalValue)}%' OR CAST(${qualifiedJsonColumn} AS TEXT) LIKE '%${escapeSql(compactValue)}%')`
            )
        };
    }
}

function parseOptionalNumber(rawValue: unknown): number | null {
    if (rawValue === undefined || rawValue === null) {
        return null;
    }

    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? rawValue : null;
    }

    const normalized = String(rawValue).trim().replace(',', '.');
    if (!normalized) {
        return null;
    }

    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export class ExampleDatatablePriceRangeFilterHandler extends AbstractCustomFilter {
    public readonly name = 'Price range';
    public readonly description = 'Filter by price range inside datatable JSON array';
    public readonly inputConfig = {
        from: { placeholder: 'Price from', type: 'number' as const },
        to: { placeholder: 'Price to', type: 'number' as const },
    };

    constructor() {
        super('Example', 'datatable');
    }

    public buildCondition(value: unknown): FilterCustomFieldCondition {
        const qualifiedColumn = '`Example`.`datatable`';
        const valueObject = typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value as Record<string, unknown>
            : {};

        let from = parseOptionalNumber(valueObject.from);
        let to = parseOptionalNumber(valueObject.to);

        if (from !== null && to !== null && from > to) {
            [from, to] = [to, from];
        }

        if (from === null && to === null) {
            return { criteria: {} };
        }

        const clauses: string[] = [];
        if (from !== null) {
            clauses.push(`CAST(json_extract(price_item.value, '$.price') AS REAL) >= ${from}`);
        }
        if (to !== null) {
            clauses.push(`CAST(json_extract(price_item.value, '$.price') AS REAL) <= ${to}`);
        }

        const sql = `EXISTS (SELECT 1 FROM json_each(COALESCE(${qualifiedColumn}, '[]')) AS price_item WHERE ${clauses.join(' AND ')})`;

        return {
            criteria: Sequelize.literal(sql)
        };
    }
}

export class TypeOrmExampleJsonCustomFilterHandler extends AbstractCustomFilter {
    public readonly name = 'Example JSON text search';
    public readonly description = 'Search by substring in JSON text';
    public readonly inputConfig = {
        query: { placeholder: 'JSON text', type: 'text' as const }
    };

    constructor() {
        super('Example', 'json');
    }

    public buildCondition(value: unknown): FilterCustomFieldCondition {
        const valueFromInput = typeof value === 'object' && value !== null && !Array.isArray(value)
            ? (value as Record<string, unknown>).query
            : value;
        const originalValue = normalizeSearchValue(valueFromInput);

        if (!originalValue) {
            return { criteria: {} };
        }

        const compactValue = originalValue.replace(/\s+/g, '').replace(/,+$/g, '');
        const pairFilters = extractJsonPairFilters(originalValue);

        return {
            criteria: new Brackets((builder) => {
                if (pairFilters.key || pairFilters.value) {
                    if (pairFilters.key) {
                        builder.andWhere(`json_extract(${TYPEORM_ROOT_ALIAS}.json, '$.key') LIKE :jsonKey`, {
                            jsonKey: likePattern(pairFilters.key),
                        });
                    }
                    if (pairFilters.value) {
                        builder.andWhere(`json_extract(${TYPEORM_ROOT_ALIAS}.json, '$.value') LIKE :jsonValue`, {
                            jsonValue: likePattern(pairFilters.value),
                        });
                    }
                    return;
                }

                builder.where(`CAST(${TYPEORM_ROOT_ALIAS}.json AS TEXT) LIKE :jsonOriginal`, {
                    jsonOriginal: likePattern(originalValue),
                });

                if (compactValue !== originalValue) {
                    builder.orWhere(`CAST(${TYPEORM_ROOT_ALIAS}.json AS TEXT) LIKE :jsonCompact`, {
                        jsonCompact: likePattern(compactValue),
                    });
                }
            }) as any
        };
    }
}

export class TypeOrmExampleDatatablePriceRangeFilterHandler extends AbstractCustomFilter {
    public readonly name = 'Price range';
    public readonly description = 'Filter by price range inside datatable JSON array';
    public readonly inputConfig = {
        from: { placeholder: 'Price from', type: 'number' as const },
        to: { placeholder: 'Price to', type: 'number' as const },
    };

    constructor() {
        super('Example', 'datatable');
    }

    public buildCondition(value: unknown): FilterCustomFieldCondition {
        const valueObject = typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value as Record<string, unknown>
            : {};

        let from = parseOptionalNumber(valueObject.from);
        let to = parseOptionalNumber(valueObject.to);

        if (from !== null && to !== null && from > to) {
            [from, to] = [to, from];
        }

        if (from === null && to === null) {
            return { criteria: {} };
        }

        return {
            criteria: new Brackets((builder) => {
                const clauses: string[] = [];
                const params: Record<string, number> = {};

                if (from !== null) {
                    clauses.push(`CAST(json_extract(price_item.value, '$.price') AS REAL) >= :datatablePriceFrom`);
                    params.datatablePriceFrom = from;
                }
                if (to !== null) {
                    clauses.push(`CAST(json_extract(price_item.value, '$.price') AS REAL) <= :datatablePriceTo`);
                    params.datatablePriceTo = to;
                }

                builder.where(
                    `EXISTS (SELECT 1 FROM json_each(COALESCE(${TYPEORM_ROOT_ALIAS}.datatable, '[]')) AS price_item WHERE ${clauses.join(' AND ')})`,
                    params
                );
            }) as any
        };
    }
}
