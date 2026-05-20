import { Fields } from '../../helpers/fieldsHelper';
import { AbstractModel } from '../model/AbstractModel';
import { DataAccessor } from '../DataAccessor';
import { BaseFieldConfig } from '../../interfaces/adminpanelConfig';
import { FilterCondition, FilterOperator } from '../../models/FilterAP';
import { CustomFilterHandler } from '../filters/CustomFilterHandler';
import { ListQueryBuilderParams, ListQueryBuilderResult } from '../../interfaces/listQueryBuilder';
import { CriteriaWhere } from '../../interfaces/queryCriteria';

/**
 * Security limits for filter conditions
 */
export const FILTER_SECURITY_LIMITS = {
    MAX_DEPTH: 10,                  // Maximum nesting depth
    MAX_IN_VALUES: 1000,            // Maximum elements in IN operator
    MAX_CONDITIONS_PER_GROUP: 100,  // Maximum conditions in one group
    MAX_TOTAL_CONDITIONS: 500,      // Maximum conditions in entire filter tree
    MAX_STRING_LENGTH: 10000        // Maximum string length in filter value
};

/**
 * Custom field condition result
 */
export interface CustomFieldCondition {
    rawSQL?: string;
    params?: any[];
    inMemory?: (record: any) => boolean;
    criteria?: Record<string, any>;
}

/**
 * ListQueryBuilder - replaces legacy NodeTable
 *
 * Key improvements:
 * - Promise-based API (no callbacks)
 * - Clean interface without DataTables.js format
 * - Direct integration with FilterCondition
 * - Support for CustomFilterHandler
 * - TypeScript type safety
 * - Full operator support (eq, neq, gt, gte, lt, lte, like, ilike, in, between, isNull, regex, custom)
 * - Nested AND/OR/NOT groups
 */
export class ListQueryBuilder {
    private fieldsArray: string[] = ['actions'];

    constructor(
        private model: AbstractModel<any>,
        private fields: Fields,
        private dataAccessor: DataAccessor,
        private customFilterHandler?: CustomFilterHandler
    ) {
        this.fieldsArray = this.fieldsArray.concat(Object.keys(this.fields));
    }

    /**
     * Public method to build WHERE clause without executing query
     * Useful for external execution (e.g., direct adapter calls)
     */
    buildWhereClause(params: ListQueryBuilderParams): CriteriaWhere {
        return this.buildWhere(params);
    }

    /**
     * Execute query with Promise API
     */
    async execute(params: ListQueryBuilderParams): Promise<ListQueryBuilderResult> {
        
        const whereClause = this.buildWhere(params);
        const orderClause = this.buildOrder(params);
        const offset = (params.page - 1) * params.limit;

        // Execute queries in parallel
        const [data, total, filtered] = await Promise.all([
            this.model.find({
                where: whereClause,
                sort: orderClause,
                limit: params.limit,
                skip: offset,
                select: this.buildSelect(params.fields)
            }, this.dataAccessor),
            this.model.count({}, this.dataAccessor),
            this.model.count({where: whereClause}, this.dataAccessor)
        ]);

        return {
            data: this.mapData(data),
            total,
            filtered,
            page: params.page,
            limit: params.limit,
            pages: Math.ceil(filtered / params.limit)
        };
    }

    /**
     * Build WHERE clause from FilterCondition[]
     * Supports nested AND/OR/NOT groups
     */
    private buildWhere(params: ListQueryBuilderParams): CriteriaWhere {
        const conditions: CriteriaWhere[] = [];
        
        // 1. Filters from FilterCondition
        if (params.filters && params.filters.length > 0) {
            const filterCondition = this.buildConditionGroup(params.filters, 'AND');
            // Check if filterCondition is not empty (including null values)
            const hasKeys = Object.keys(filterCondition).length > 0;
            const hasNullValue = Object.values(filterCondition).some(v => v === null);
            
            if (hasKeys || hasNullValue) {
                conditions.push(filterCondition);
            }
        }

        // 2. Global search (for compatibility)
        if (params.globalSearch) {
            const searchConditions = this.buildGlobalSearch(params.globalSearch);
            if (searchConditions && Object.keys(searchConditions).length > 0) {
                conditions.push(searchConditions);
            }
        }

        // Combine with AND
        if (conditions.length === 0) {
            return {};
        }

        if (conditions.length === 1) {
            return conditions[0];
        }

        return { and: conditions };
    }

    /**
     * Recursive condition group builder
     * Key method for complex filter support
     */
    private buildConditionGroup(
        conditions: FilterCondition[],
        logic: 'AND' | 'OR' | 'NOT' = 'AND',
        depth: number = 0
    ): CriteriaWhere {
        // Security: check depth
        if (depth > FILTER_SECURITY_LIMITS.MAX_DEPTH) {
            throw new Error(`Filter nesting too deep (max ${FILTER_SECURITY_LIMITS.MAX_DEPTH})`);
        }

        // Security: check conditions count
        if (conditions.length > FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP) {
            throw new Error(`Too many conditions in group (max ${FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP})`);
        }

        const clauses = conditions
            .filter(cond => this.isValidCondition(cond, depth))
            .map(cond => {
                // Recursion for nested groups
                if (cond.children && cond.children.length > 0) {
                    return this.buildConditionGroup(
                        cond.children,
                        cond.logic || 'AND',
                        depth + 1
                    );
                }

                // Simple condition
                return this.buildSingleCondition(cond);
            })
            .filter(c => {
                if (!c) return false;

                // Check for regular keys
                const keys = Object.keys(c);
                if (keys.length > 0) {
                    for (const key of keys) {
                        const val = c[key];
                        // null is a valid value (IS NULL condition)
                        if (val === null) return true;
                        if (val && typeof val === 'object') {
                            if (Object.keys(val).length > 0) return true;
                        } else if (val !== undefined) {
                            return true;
                        }
                    }
                }

                return false;
            });

        if (clauses.length === 0) {
            return {};
        }

        if (clauses.length === 1) {
            // NOT operator
            if (logic === 'NOT') {
                return { not: clauses[0] };
            }
            return clauses[0];
        }

        // NOT operator requires exactly one condition
        if (logic === 'NOT') {
            throw new Error('NOT operator requires exactly one condition');
        }

        return logic === 'OR'
            ? { or: clauses }
            : { and: clauses };
    }

    /**
     * Validate condition
     */
    private isValidCondition(cond: FilterCondition, _depth: number = 0): boolean {
        // Group with children
        if (cond.children && cond.children.length > 0) {
            return true;
        }

        const hasRelation = Boolean(cond.relation && cond.relationField);

        // Regular condition
        if (!cond.field && !hasRelation && !cond.customHandler && !cond.rawSQL) {
            return false;
        }

        if (!cond.operator) {
            return false;
        }

        // Operators without value
        if (cond.operator === 'isNull' || cond.operator === 'isNotNull' || cond.operator === 'today') {
            return true;
        }

        // Custom handlers may have their own validation
        if (cond.customHandler || cond.rawSQL) {
            return true;
        }

        // Relation conditions must have value (except NULL checks handled above)
        if (hasRelation) {
            return cond.value !== undefined && cond.value !== '';
        }

        // Others require value
        return cond.value !== undefined && cond.value !== '';
    }

    /**
     * Build single condition
     */
    private buildSingleCondition(cond: FilterCondition): CriteriaWhere {
        // 1. Raw SQL is intentionally not part of QueryCriteria.
        if (cond.rawSQL) {
            throw new Error("Raw SQL filters are not supported by QueryCriteria");
        }

        // 2. Custom handler
        if (cond.customHandler) {
            return this.handleCustomCondition(cond);
        }

        // 3. Relation condition
        if (cond.relation && cond.relationField) {
            return this.buildRelationCondition(cond);
        }

        // 4. Standard field condition
        const { field, operator, value } = cond;

        // Ensure field and operator exist
        if (!field || !operator) {
            return {};
        }

        // Get field config to handle special cases
        const fieldConfig = this.fields[field];
        const fieldType = fieldConfig?.model?.type as string | undefined;
        const fieldConfigType = typeof fieldConfig?.config === 'object' && fieldConfig?.config !== null
            ? (fieldConfig.config as any)?.type as string | undefined
            : undefined;

        // Special handling for select-many (JSON array stored in DB) with in/notIn/eq operators
        // select-many widget stores data as JSON array: ["value1","value2"]
        if ((fieldType === 'json' || fieldConfigType === 'select-many') &&
            Array.isArray(value)) {
            if (operator === 'eq') {
                return { [field]: {jsonContains: value} };
            }

            if (operator === 'in' || operator === 'notIn') {
                const clauses = value.map((item) => ({[field]: {jsonContains: item}}));
                return operator === 'in'
                    ? {or: clauses}
                    : {not: {or: clauses}};
            }
        }

        // Special handling for isNull - return { field: null }
        if (operator === 'isNull') {
            return { [field]: null };
        }

        // Special handling for isNotNull - return { not: { field: null } }
        if (operator === 'isNotNull') {
            return { [field]: {isNotNull: true} };
        }

        // Validate operator-value combination
        this.validateOperatorValue(operator, value);

        // Map operator to ORM condition (ignore value for isNull/isNotNull)
        const condition = this.mapOperatorToCondition(operator, value);

        // Skip if condition is undefined/null (invalid value)
        if (condition === undefined || condition === null) {
            return {};
        }

        return { [field]: condition };
    }

    /**
     * Map filter operators to adapter-neutral criteria operators.
     */
    private mapOperatorToCondition(operator: FilterOperator, value: any): any {
        const operatorsWithoutValue: FilterOperator[] = ['isNull', 'isNotNull', 'today'];
        // Return undefined for invalid values (will be filtered out)
        // Note: false is a valid boolean value and should NOT be filtered out
        if (!operatorsWithoutValue.includes(operator) && (value === undefined || value === null || value === '')) {
            return undefined;
        }

        switch (operator) {
            case 'eq':
                // Convert string 'true'/'false' to actual boolean values
                // For boolean fields, return value directly.
                if (value === 'true') return true;
                if (value === 'false') return false;
                if (typeof value === 'boolean') return value;
                return value;

            case 'neq':
                // Convert string 'true'/'false' to actual boolean values
                const neqValue = value === 'true' ? true : value === 'false' ? false : value;
                return { ne: neqValue };

            case 'gt':
                return { gt: value };

            case 'gte':
                return { gte: value };

            case 'lt':
                return { lt: value };

            case 'lte':
                return { lte: value };

            case 'like':
                if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
                    return { contains: value.slice(1, -1) };
                }
                return { contains: value };

            case 'ilike':
                // Case-insensitive LIKE - works on all dialects
                if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
                    return { contains: value.slice(1, -1) };
                }
                return { contains: value };

            case 'startsWith':
                return { startsWith: value };

            case 'endsWith':
                return { endsWith: value };

            case 'regex':
                return { regex: value };

            case 'in':
                // Convert string 'true'/'false' to actual boolean values in array
                const inValues = Array.isArray(value) ? value : [value];
                const convertedInValues = inValues.map((v: any) => 
                    v === 'true' ? true : v === 'false' ? false : v
                );
                return { in: convertedInValues };

            case 'notIn':
                // Convert string 'true'/'false' to actual boolean values in array
                const notInValues = Array.isArray(value) ? value : [value];
                const convertedNotInValues = notInValues.map((v: any) => 
                    v === 'true' ? true : v === 'false' ? false : v
                );
                return { notIn: convertedNotInValues };

            case 'between':
                if (Array.isArray(value) && value.length === 2) {
                    return { between: value };
                }
                return value;

            case 'today': {
                const [from, to] = this.getDayRange(new Date());
                return { between: [from, to] };
            }

            case 'month': {
                const range = this.getMonthRangeByValue(value);
                return range ? { between: range } : undefined;
            }

            case 'year': {
                const range = this.getYearRangeByValue(value);
                return range ? { between: range } : undefined;
            }

            case 'monthBetween': {
                const range = this.getMonthRangeBetween(value);
                return range ? { between: range } : undefined;
            }

            case 'yearBetween': {
                const range = this.getYearRangeBetween(value);
                return range ? { between: range } : undefined;
            }

            case 'custom':
                // Custom conditions are handled separately
                return value;

            default:
                return value;
        }
    }

    /**
     * Validate operator-value combination
     */
    private validateOperatorValue(operator: FilterOperator, value: any): void {
        const operatorsWithoutValue: FilterOperator[] = ['isNull', 'isNotNull', 'today'];
        // Skip validation for undefined/null/empty values (will be filtered out)
        if (!operatorsWithoutValue.includes(operator) && (value === undefined || value === null || value === '')) {
            return;
        }
        
        switch (operator) {
            case 'in':
            case 'notIn':
                if (!Array.isArray(value)) {
                    throw new Error(`Operator '${operator}' requires array value`);
                }
                if (value.length > FILTER_SECURITY_LIMITS.MAX_IN_VALUES) {
                    throw new Error(`Too many values in IN operator (max ${FILTER_SECURITY_LIMITS.MAX_IN_VALUES})`);
                }
                break;

            case 'between':
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('BETWEEN operator requires array of 2 values');
                }
                break;

            case 'month':
                if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
                    throw new Error('MONTH operator requires YYYY-MM value');
                }
                break;

            case 'year':
                if (
                    !((typeof value === 'string' && /^\d{4}$/.test(value)) ||
                        (typeof value === 'number' && Number.isInteger(value)))
                ) {
                    throw new Error('YEAR operator requires YYYY value');
                }
                break;

            case 'monthBetween':
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('MONTH BETWEEN operator requires array of 2 YYYY-MM values');
                }
                if (
                    typeof value[0] !== 'string' || !/^\d{4}-\d{2}$/.test(value[0]) ||
                    typeof value[1] !== 'string' || !/^\d{4}-\d{2}$/.test(value[1])
                ) {
                    throw new Error('MONTH BETWEEN operator requires array of 2 YYYY-MM values');
                }
                break;

            case 'yearBetween':
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('YEAR BETWEEN operator requires array of 2 YYYY values');
                }
                if (!this.isYearValue(value[0]) || !this.isYearValue(value[1])) {
                    throw new Error('YEAR BETWEEN operator requires array of 2 YYYY values');
                }
                break;

            case 'regex':
                if (typeof value !== 'string') {
                    throw new Error('Regex operator requires string pattern');
                }
                try {
                    new RegExp(value);
                } catch (e) {
                    throw new Error(`Invalid regex pattern: ${value}`);
                }
                break;

            case 'like':
            case 'ilike':
            case 'startsWith':
            case 'endsWith':
                if (typeof value === 'string' && value.length > FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH) {
                    throw new Error(`String value too long (max ${FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH})`);
                }
                break;
        }
    }

    private getDayRange(date: Date): [Date, Date] {
        const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return [from, to];
    }

    private getMonthRangeByValue(value: any): [Date, Date] | null {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
            return null;
        }
        const [year, month] = value.split('-').map(Number);
        if (!year || !month || month < 1 || month > 12) {
            return null;
        }
        const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const to = new Date(year, month, 0, 23, 59, 59, 999);
        return [from, to];
    }

    private getYearRangeByValue(value: any): [Date, Date] | null {
        const year = this.parseYearValue(value);
        if (year === null) {
            return null;
        }
        const from = new Date(year, 0, 1, 0, 0, 0, 0);
        const to = new Date(year, 11, 31, 23, 59, 59, 999);
        return [from, to];
    }

    private getMonthRangeBetween(value: any): [Date, Date] | null {
        if (!Array.isArray(value) || value.length !== 2) {
            return null;
        }
        const fromRange = this.getMonthRangeByValue(value[0]);
        const toRange = this.getMonthRangeByValue(value[1]);
        if (!fromRange || !toRange) {
            return null;
        }
        const start = fromRange[0] <= toRange[0] ? fromRange[0] : toRange[0];
        const end = fromRange[1] <= toRange[1] ? toRange[1] : fromRange[1];
        return [start, end];
    }

    private getYearRangeBetween(value: any): [Date, Date] | null {
        if (!Array.isArray(value) || value.length !== 2) {
            return null;
        }
        const fromRange = this.getYearRangeByValue(value[0]);
        const toRange = this.getYearRangeByValue(value[1]);
        if (!fromRange || !toRange) {
            return null;
        }
        const start = fromRange[0] <= toRange[0] ? fromRange[0] : toRange[0];
        const end = fromRange[1] <= toRange[1] ? toRange[1] : fromRange[1];
        return [start, end];
    }

    private isYearValue(value: any): boolean {
        return this.parseYearValue(value) !== null;
    }

    private parseYearValue(value: any): number | null {
        if (typeof value === 'number' && Number.isInteger(value)) {
            return value;
        }
        if (typeof value === 'string' && /^\d{4}$/.test(value)) {
            return Number(value);
        }
        return null;
    }

    /**
     * Build relation condition
     */
    private buildRelationCondition(cond: FilterCondition): CriteriaWhere {
        const { relation, relationField, operator, value } = cond;

        // Ensure operator and safe relation path parts exist
        if (!relation || !relationField || !operator) {
            return {};
        }

        if (!/^[A-Za-z0-9_]+$/.test(relation) || !/^[A-Za-z0-9_]+$/.test(relationField)) {
            return {};
        }

        const relationPath = `$${relation}.${relationField}$`;

        if (operator === 'isNull') {
            return { [relationPath]: null };
        }

        if (operator === 'isNotNull') {
            return { [relationPath]: { isNotNull: true } };
        }

        this.validateOperatorValue(operator, value);
        const relationCondition = this.mapOperatorToCondition(operator, value);
        if (relationCondition === undefined || relationCondition === null) {
            return {};
        }

        return { [relationPath]: relationCondition };
    }

    /**
     * Handle custom condition
     */
    private handleCustomCondition(cond: FilterCondition): Record<string, any> {
        const handler = this.customFilterHandler?.get(cond.customHandler || '');

        if (handler) {
            const condition = handler.buildCondition(
                cond.value,
                cond.customHandlerParams
            );

            // rawSQL returned
            if (condition.rawSQL) {
                throw new Error("Raw SQL filters are not supported by QueryCriteria");
            }

            // in-memory function returned
            if (condition.inMemory) {
                throw new Error("In-memory filters are not supported by QueryCriteria");
            }

            // Standard criteria returned
            if (condition.criteria) {
                return condition.criteria;
            }

            return condition;
        }

        return {};
    }

    /**
     * Build global search condition
     * Searches in string/text/ref fields (same behavior as NodeTable)
     * Date/time fields are excluded from global search to avoid moment.js warnings
     */
    private buildGlobalSearch(searchStr: string): CriteriaWhere | null {
        // Skip if empty
        if (!searchStr || searchStr.trim() === '') {
            return null;
        }

        const searchConditions: any[] = [];

        for (const [fieldName, fieldConfig] of Object.entries(this.fields)) {
            // Skip non-visible fields (same behavior as NodeTable)
            const config = typeof fieldConfig.config === 'object' && fieldConfig.config !== null
                ? fieldConfig.config
                : null;
            
            if (config && (config as any).visible === false) {
                continue;
            }
            
            const fieldType = fieldConfig.model?.type as string;

            // Skip date/datetime fields - they can't be searched with LIKE
            // This avoids moment.js warnings when string values are passed to date fields
            if (fieldType === 'date' || fieldType === 'datetime') {
                continue;
            }

            // Global search in string/text/ref fields
            if (fieldType === 'string' || fieldType === 'text' || fieldType === 'ref') {
                searchConditions.push({
                    [fieldName]: { contains: searchStr }
                });
            }
        }

        if (searchConditions.length === 0) {
            return null;
        }

        if (searchConditions.length === 1) {
            return searchConditions[0];
        }

        return { or: searchConditions };
    }

    /**
     * Build ORDER clause
     */
    private buildOrder(params: ListQueryBuilderParams): string {
        const sortField = params.sort || 'createdAt';
        const sortDirection = this.sanitizeSortDirection(params.sortDirection as string | undefined);

        // Validate sort field exists
        if (sortField !== 'createdAt' && sortField !== 'updatedAt') {
            const fieldExists = sortField in this.fields ||
                sortField === this.model.primaryKey ||
                sortField === 'id';

            if (!fieldExists) {
                // Fallback to createdAt if field doesn't exist
                return 'createdAt DESC';
            }
        }

        return `${sortField} ${sortDirection}`;
    }

    private sanitizeSortDirection(sortDirection?: string): 'ASC' | 'DESC' {
        if (!sortDirection) {
            return 'DESC';
        }

        const normalizedDirection = sortDirection.toUpperCase();
        if (normalizedDirection !== 'ASC' && normalizedDirection !== 'DESC') {
            return 'DESC';
        }

        return normalizedDirection;
    }

    /**
     * Map data for output
     */
    private mapData(data: any[]): any[] {
        const out: any[] = [];

        data.forEach((elem: any) => {
            const row: any = {};

            // Add primary key first
            const pk = this.model.primaryKey ?? 'id';
            row[pk] = elem[pk];

            // Process each field
            Object.keys(this.fields).forEach((key: string) => {
                const fieldConfig = this.fields[key].config as BaseFieldConfig;
                const fieldModel = this.fields[key].model;
                const modelConfig = this.fields[key].modelConfig;

                const displayField = modelConfig?.titleField ??
                    (typeof elem['title'] !== 'undefined' ? 'title' :
                        typeof elem['name'] !== 'undefined' ? 'name' :
                            modelConfig?.identifierField ?? 'id');

                if (fieldConfig.displayModifier) {
                    // Custom display modifier
                    row[key] = fieldConfig.displayModifier(elem[key]);
                } else if (fieldModel && fieldModel.model) {
                    // Handle "belongsTo" relationships
                    if (!elem[key]) {
                        row[key] = null;
                    } else {
                        row[key] = elem[key][displayField];
                    }
                } else if (fieldModel?.type === 'association-many' || fieldModel?.type === 'association') {
                    // Handle "hasMany" relationships
                    if (!elem[key] || elem[key].length === 0) {
                        row[key] = null;
                    } else {
                        const displayValues: string[] = [];
                        elem[key].forEach((item: any) => {
                            if (item[displayField]) {
                                displayValues.push(item[displayField]);
                            } else if (fieldConfig.identifierField && item[fieldConfig.identifierField]) {
                                displayValues.push(item[fieldConfig.identifierField]);
                            }
                        });
                        row[key] = displayValues.join(', ');
                    }
                } else if (fieldModel?.type === 'json') {
                    // Handle JSON fields
                    const str = JSON.stringify(elem[key]);
                    row[key] = str === '{}' ? '' : str;
                } else {
                    // Regular field
                    row[key] = elem[key];
                }
            });

            out.push(row);
        });

        return out;
    }

    private buildSelect(fields?: string[]): string[] | undefined {
        if (!fields?.length) {
            return undefined;
        }

        const selectableFields = fields.filter((field) => {
            const modelField = this.model.attributes[field];
            if (!modelField) {
                return false;
            }

            return !modelField.model
                && !modelField.collection
                && modelField.type !== "association"
                && modelField.type !== "association-many";
        });

        if (this.model.primaryKey && !selectableFields.includes(this.model.primaryKey)) {
            selectableFields.unshift(this.model.primaryKey);
        }

        return selectableFields.length ? selectableFields : undefined;
    }

    /**
     * Get allowed operators for field type
     */
    static getOperatorsForFieldType(fieldType: string): FilterOperator[] {
        const operatorsByType: Record<string, FilterOperator[]> = {
            string: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'in', 'notIn', 'isNull', 'isNotNull', 'regex'],
            text: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
            number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            integer: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            float: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            boolean: ['eq', 'neq', 'isNull', 'isNotNull'],
            date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'today', 'month', 'year', 'monthBetween', 'yearBetween', 'isNull', 'isNotNull'],
            datetime: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'today', 'month', 'year', 'monthBetween', 'yearBetween', 'isNull', 'isNotNull'],
            select: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
            json: ['isNull', 'isNotNull', 'custom'],
            association: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
            'association-many': ['in', 'notIn', 'isNull', 'isNotNull']
        };

        return operatorsByType[fieldType] || operatorsByType.string;
    }
}

export { ListQueryBuilder as ModernListQueryBuilder };
