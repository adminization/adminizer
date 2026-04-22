import { Adminizer } from '../Adminizer';
import { FilterService } from './FilterService';
import { FilterAP, FilterCondition, FilterOperator, FilterVisibility } from '../../models/FilterAP';
import { FilterColumnAP } from '../../models/FilterColumnAP';
import { UserAP } from '../../models/UserAP';

/**
 * Lifecycle hook types
 */
export type FilterHookType =
    | 'beforeCreate'
    | 'afterCreate'
    | 'beforeUpdate'
    | 'afterUpdate'
    | 'beforeDelete'
    | 'afterDelete'
    | 'beforeExecute'
    | 'afterExecute';

/**
 * Hook callback signature
 */
export type FilterHookCallback = (
    filter: Partial<FilterAP>,
    context: FilterHookContext
) => Promise<Partial<FilterAP> | void> | Partial<FilterAP> | void;

/**
 * Hook context
 */
export interface FilterHookContext {
    adminizer: Adminizer;
    user?: UserAP;
    operation: 'create' | 'update' | 'delete' | 'execute';
    originalFilter?: FilterAP;
}

/**
 * Filter definition for config registration
 */
export interface FilterDefinition {
    name: string;
    modelName: string;
    description?: string;
    conditions: FilterCondition[];
    sortField?: string;
    sortDirection?: 'ASC' | 'DESC';
    visibility?: FilterVisibility;
    icon?: string;
    color?: string;
    columns?: Array<{
        fieldName: string;
        order?: number;
    }>;
}

/**
 * FilterBuilder - Fluent API for programmatic filter creation
 *
 * Example usage:
 * ```typescript
 * const filter = await FilterBuilder.create(adminizer)
 *     .forModel('Order')
 *     .named('Recent High-Value Orders')
 *     .where('status', 'eq', 'completed')
 *     .andWhere('total', 'gte', 1000)
 *     .sortBy('createdAt', 'DESC')
 *     .asPublic()
 *     .save(user);
 * ```
 */
export class FilterBuilder {
    private adminizer: Adminizer;
    private filterData: Partial<FilterAP> = {
        conditions: [],
        visibility: 'private',
        version: 1,
        apiEnabled: false
    };
    private columnsData: Array<Partial<FilterColumnAP>> = [];
    private currentGroup: FilterCondition | null = null;
    private groupStack: FilterCondition[] = [];

    // Static hooks registry
    private static hooks: Map<FilterHookType, FilterHookCallback[]> = new Map();

    // Static registered filters (from config)
    private static registeredFilters: Map<string, FilterDefinition> = new Map();

    private constructor(adminizer: Adminizer) {
        this.adminizer = adminizer;
    }

    /**
     * Create a new FilterBuilder instance
     */
    static create(adminizer: Adminizer): FilterBuilder {
        return new FilterBuilder(adminizer);
    }

    /**
     * Set the target model
     */
    forModel(modelName: string): FilterBuilder {
        this.filterData.modelName = modelName;
        return this;
    }

    /**
     * Set filter name
     */
    named(name: string): FilterBuilder {
        this.filterData.name = name;
        return this;
    }

    /**
     * Set filter description
     */
    described(description: string): FilterBuilder {
        this.filterData.description = description;
        return this;
    }

    /**
     * Add a simple condition
     */
    where(field: string, operator: FilterOperator, value?: any): FilterBuilder {
        const condition: FilterCondition = {
            id: crypto.randomUUID(),
            field,
            operator,
            value
        };

        this.addCondition(condition);
        return this;
    }

    /**
     * Add AND condition (alias for where)
     */
    andWhere(field: string, operator: FilterOperator, value?: any): FilterBuilder {
        return this.where(field, operator, value);
    }

    /**
     * Start an OR group
     */
    orWhere(field: string, operator: FilterOperator, value?: any): FilterBuilder {
        // Create OR group if not exists
        if (!this.currentGroup || this.currentGroup.logic !== 'OR') {
            const existingConditions = [...(this.filterData.conditions || [])];

            const orGroup: FilterCondition = {
                id: crypto.randomUUID(),
                logic: 'OR',
                children: existingConditions
            };

            this.filterData.conditions = [orGroup];
            this.currentGroup = orGroup;
        }

        const condition: FilterCondition = {
            id: crypto.randomUUID(),
            field,
            operator,
            value
        };

        this.currentGroup.children!.push(condition);
        return this;
    }

    /**
     * Add relation condition
     */
    whereRelation(
        relation: string,
        relationField: string,
        operator: FilterOperator,
        value?: any
    ): FilterBuilder {
        const condition: FilterCondition = {
            id: crypto.randomUUID(),
            relation,
            relationField,
            operator,
            value
        };

        this.addCondition(condition);
        return this;
    }

    /**
     * Add isNull condition
     */
    whereNull(field: string): FilterBuilder {
        return this.where(field, 'isNull');
    }

    /**
     * Add isNotNull condition
     */
    whereNotNull(field: string): FilterBuilder {
        return this.where(field, 'isNotNull');
    }

    /**
     * Add IN condition
     */
    whereIn(field: string, values: any[]): FilterBuilder {
        return this.where(field, 'in', values);
    }

    /**
     * Add NOT IN condition
     */
    whereNotIn(field: string, values: any[]): FilterBuilder {
        return this.where(field, 'notIn', values);
    }

    /**
     * Add BETWEEN condition
     */
    whereBetween(field: string, min: any, max: any): FilterBuilder {
        return this.where(field, 'between', [min, max]);
    }

    /**
     * Add LIKE condition
     */
    whereLike(field: string, pattern: string): FilterBuilder {
        return this.where(field, 'like', pattern);
    }

    /**
     * Add case-insensitive LIKE condition
     */
    whereILike(field: string, pattern: string): FilterBuilder {
        return this.where(field, 'ilike', pattern);
    }

    /**
     * Start a nested AND group
     */
    startAndGroup(): FilterBuilder {
        const group: FilterCondition = {
            id: crypto.randomUUID(),
            logic: 'AND',
            children: []
        };

        if (this.currentGroup) {
            this.groupStack.push(this.currentGroup);
            this.currentGroup.children!.push(group);
        } else {
            this.filterData.conditions!.push(group);
        }

        this.currentGroup = group;
        return this;
    }

    /**
     * Start a nested OR group
     */
    startOrGroup(): FilterBuilder {
        const group: FilterCondition = {
            id: crypto.randomUUID(),
            logic: 'OR',
            children: []
        };

        if (this.currentGroup) {
            this.groupStack.push(this.currentGroup);
            this.currentGroup.children!.push(group);
        } else {
            this.filterData.conditions!.push(group);
        }

        this.currentGroup = group;
        return this;
    }

    /**
     * End current group
     */
    endGroup(): FilterBuilder {
        if (this.groupStack.length > 0) {
            this.currentGroup = this.groupStack.pop()!;
        } else {
            this.currentGroup = null;
        }
        return this;
    }

    /**
     * Add custom handler condition
     */
    whereCustom(
        handlerName: string,
        value?: any,
        params?: any
    ): FilterBuilder {
        const condition: FilterCondition = {
            id: crypto.randomUUID(),
            customHandler: handlerName,
            operator: 'custom',
            value,
            customHandlerParams: params
        };

        this.addCondition(condition);
        return this;
    }

    /**
     * Add raw SQL condition (admin only)
     */
    whereRaw(sql: string, params?: any[]): FilterBuilder {
        const condition: FilterCondition = {
            id: crypto.randomUUID(),
            rawSQL: sql,
            rawSQLParams: params
        };

        this.addCondition(condition);
        return this;
    }

    /**
     * Set sort field and direction
     */
    sortBy(field: string, direction: 'ASC' | 'DESC' = 'DESC'): FilterBuilder {
        this.filterData.sortField = field;
        this.filterData.sortDirection = direction;
        return this;
    }

    /**
     * Set as private filter (default)
     */
    asPrivate(): FilterBuilder {
        this.filterData.visibility = 'private';
        return this;
    }

    /**
     * Set as public filter
     */
    asPublic(): FilterBuilder {
        this.filterData.visibility = 'public';
        return this;
    }

    /**
     * Set as group filter
     */
    forGroups(groupIds: number[]): FilterBuilder {
        this.filterData.visibility = 'groups';
        this.filterData.groupIds = groupIds;
        return this;
    }

    /**
     * Set as system filter (hidden from UI list)
     */
    asSystem(): FilterBuilder {
        this.filterData.visibility = 'system';
        return this;
    }

    /**
     * Enable API access
     */
    withApiAccess(enabled: boolean = true): FilterBuilder {
        this.filterData.apiEnabled = enabled;
        if (enabled && !this.filterData.apiKey) {
            this.filterData.apiKey = crypto.randomUUID();
        }
        return this;
    }

    /**
     * Set icon
     */
    withIcon(icon: string): FilterBuilder {
        this.filterData.icon = icon;
        return this;
    }

    /**
     * Set color
     */
    withColor(color: string): FilterBuilder {
        this.filterData.color = color;
        return this;
    }

    /**
     * Add column configuration
     */
    withColumn(
        fieldName: string,
        options?: {
            order?: number;
        }
    ): FilterBuilder {
        this.columnsData.push({
            fieldName,
            order: options?.order ?? this.columnsData.length
        });
        return this;
    }

    /**
     * Set multiple columns at once
     */
    withColumns(
        columns: Array<{
            fieldName: string;
            order?: number;
        }>
    ): FilterBuilder {
        for (const col of columns) {
            this.withColumn(col.fieldName, col);
        }
        return this;
    }

    /**
     * Add condition to current group or root
     */
    private addCondition(condition: FilterCondition): void {
        if (this.currentGroup) {
            this.currentGroup.children!.push(condition);
        } else {
            this.filterData.conditions!.push(condition);
        }
    }

    /**
     * Build filter data without saving
     */
    build(): Partial<FilterAP> {
        return { ...this.filterData };
    }

    /**
     * Save the filter to database
     */
    async save(user: UserAP): Promise<FilterAP> {
        const filterService = new FilterService(this.adminizer);

        // Run beforeCreate hooks
        const context: FilterHookContext = {
            adminizer: this.adminizer,
            user,
            operation: 'create'
        };

        let filterData = await FilterBuilder.runHooks('beforeCreate', this.filterData, context);

        // Create filter
        const filter = await filterService.createFilter(filterData as any, user);

        // Save columns if any
        if (this.columnsData.length > 0) {
            await filterService.updateFilterColumns(filter.id, this.columnsData, user);
        }

        // Run afterCreate hooks
        await FilterBuilder.runHooks('afterCreate', filter, context);

        return filter;
    }

    // ==================== Static Methods ====================

    /**
     * Register a lifecycle hook
     */
    static onHook(hookType: FilterHookType, callback: FilterHookCallback): void {
        if (!FilterBuilder.hooks.has(hookType)) {
            FilterBuilder.hooks.set(hookType, []);
        }
        FilterBuilder.hooks.get(hookType)!.push(callback);
    }

    /**
     * Remove a lifecycle hook
     */
    static offHook(hookType: FilterHookType, callback: FilterHookCallback): void {
        const hooks = FilterBuilder.hooks.get(hookType);
        if (hooks) {
            const index = hooks.indexOf(callback);
            if (index !== -1) {
                hooks.splice(index, 1);
            }
        }
    }

    /**
     * Run hooks for a lifecycle event
     */
    static async runHooks(
        hookType: FilterHookType,
        filter: Partial<FilterAP>,
        context: FilterHookContext
    ): Promise<Partial<FilterAP>> {
        const hooks = FilterBuilder.hooks.get(hookType) || [];
        let result = filter;

        for (const hook of hooks) {
            const hookResult = await hook(result, context);
            if (hookResult) {
                result = hookResult;
            }
        }

        return result;
    }

    /**
     * Register a filter definition (for config-based registration)
     */
    static registerFilter(key: string, definition: FilterDefinition): void {
        FilterBuilder.registeredFilters.set(key, definition);
    }

    /**
     * Get a registered filter definition
     */
    static getRegisteredFilter(key: string): FilterDefinition | undefined {
        return FilterBuilder.registeredFilters.get(key);
    }

    /**
     * Get all registered filter definitions
     */
    static getAllRegisteredFilters(): Map<string, FilterDefinition> {
        return new Map(FilterBuilder.registeredFilters);
    }

    /**
     * Initialize registered filters (create in database if not exist)
     */
    static async initializeRegisteredFilters(
        adminizer: Adminizer,
        systemUser: UserAP
    ): Promise<{ created: string[]; skipped: string[]; errors: string[] }> {
        const filterService = new FilterService(adminizer);
        const results = {
            created: [] as string[],
            skipped: [] as string[],
            errors: [] as string[]
        };

        for (const [key, definition] of FilterBuilder.registeredFilters) {
            try {
                // Check if same filter already exists for this model by name
                const existingFilters = await filterService.getFiltersForModel(definition.modelName, systemUser, {
                    includePublic: true,
                    includeSystem: true
                });
                const exists = existingFilters.some(filter => filter.name === definition.name);
                if (exists) {
                    results.skipped.push(key);
                    continue;
                }

                // Create filter using builder
                const builder = FilterBuilder.create(adminizer)
                    .forModel(definition.modelName)
                    .named(definition.name);

                if (definition.description) {
                    builder.described(definition.description);
                }

                // Add conditions
                for (const cond of definition.conditions) {
                    if (cond.field && cond.operator) {
                        builder.where(cond.field, cond.operator, cond.value);
                    }
                }

                // Set sort
                if (definition.sortField) {
                    builder.sortBy(definition.sortField, definition.sortDirection || 'DESC');
                }

                // Set visibility
                switch (definition.visibility) {
                    case 'public':
                        builder.asPublic();
                        break;
                    case 'system':
                        builder.asSystem();
                        break;
                    default:
                        builder.asPrivate();
                }

                // Set UI options
                if (definition.icon) builder.withIcon(definition.icon);
                if (definition.color) builder.withColor(definition.color);

                // Add columns
                if (definition.columns) {
                    builder.withColumns(definition.columns);
                }

                await builder.save(systemUser);
                results.created.push(key);
            } catch (error: any) {
                results.errors.push(`${key}: ${error?.message || error}`);
            }
        }

        return results;
    }

    /**
     * Find filters by model name
     */
    static async findByModel(
        adminizer: Adminizer,
        modelName: string,
        user: UserAP
    ): Promise<FilterAP[]> {
        const filterService = new FilterService(adminizer);
        return filterService.getFiltersForModel(modelName, user, {
            includePublic: true,
            includeSystem: true
        });
    }

    /**
     * Find filter by ID
     */
    static async findById(
        adminizer: Adminizer,
        filterId: string,
        user: UserAP
    ): Promise<FilterAP | null> {
        const filterService = new FilterService(adminizer);
        return filterService.getFilterById(filterId, user);
    }

    /**
     * Update an existing filter
     */
    static async update(
        adminizer: Adminizer,
        filterId: string,
        updates: Partial<FilterAP>,
        user: UserAP
    ): Promise<FilterAP> {
        const filterService = new FilterService(adminizer);

        const existingFilter = await filterService.getFilterById(filterId, user);
        if (!existingFilter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        // Run beforeUpdate hooks
        const context: FilterHookContext = {
            adminizer,
            user,
            operation: 'update',
            originalFilter: existingFilter
        };

        const updatedData = await FilterBuilder.runHooks('beforeUpdate', updates, context);

        // Update filter
        const filter = await filterService.updateFilter(filterId, updatedData, user);

        // Run afterUpdate hooks
        await FilterBuilder.runHooks('afterUpdate', filter, context);

        return filter;
    }

    /**
     * Delete a filter
     */
    static async delete(
        adminizer: Adminizer,
        filterId: string,
        user: UserAP
    ): Promise<void> {
        const filterService = new FilterService(adminizer);

        const existingFilter = await filterService.getFilterById(filterId, user);
        if (!existingFilter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        // Run beforeDelete hooks
        const context: FilterHookContext = {
            adminizer,
            user,
            operation: 'delete',
            originalFilter: existingFilter
        };

        await FilterBuilder.runHooks('beforeDelete', existingFilter, context);

        // Delete filter
        await filterService.deleteFilter(filterId, user);

        // Run afterDelete hooks
        await FilterBuilder.runHooks('afterDelete', existingFilter, context);
    }

    /**
     * Duplicate a filter
     */
    static async duplicate(
        adminizer: Adminizer,
        filterId: string,
        user: UserAP,
        options?: {
            newName?: string;
            asPrivate?: boolean;
        }
    ): Promise<FilterAP> {
        const filterService = new FilterService(adminizer);

        const original = await filterService.getFilterById(filterId, user);
        if (!original) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        // Build new filter from original
        const builder = FilterBuilder.create(adminizer)
            .forModel(original.modelName)
            .named(options?.newName || `${original.name} (Copy)`);

        if (original.description) {
            builder.described(original.description);
        }

        // Copy conditions
        builder.filterData.conditions = JSON.parse(JSON.stringify(original.conditions));

        // Copy sort
        if (original.sortField) {
            builder.sortBy(original.sortField, original.sortDirection || 'DESC');
        }

        // Set visibility
        if (options?.asPrivate) {
            builder.asPrivate();
        } else if (original.visibility === 'public') {
            builder.asPublic();
        } else if (original.visibility === 'groups' && original.groupIds) {
            builder.forGroups(original.groupIds);
        }

        // Copy UI settings
        if (original.icon) builder.withIcon(original.icon);
        if (original.color) builder.withColor(original.color);

        // Copy columns
        const columns = await filterService.getFilterColumns(filterId);
        if (columns.length > 0) {
            builder.withColumns(columns.map(c => ({
                fieldName: c.fieldName,
                order: c.order
            })));
        }

        return builder.save(user);
    }
}

export default FilterBuilder;
