import { Adminizer } from '../Adminizer';
import { DataAccessor } from '../DataAccessor';
import { ModernQueryBuilder, QueryParams, QueryResult } from '../query-builder/ModernQueryBuilder';
import { FilterAP, FilterCondition, FilterOperator } from '../../models/FilterAP';
import { FilterColumnAP } from '../../models/FilterColumnAP';
import { UserAP } from '../../models/UserAP';
import { Fields, Field } from '../../helpers/fieldsHelper';
import { AbstractModel } from '../model/AbstractModel';
import { FilterMigrator, MigrationResult, CURRENT_FILTER_VERSION } from './FilterMigrator';
import { ValidationResult } from './ConditionValidator';
import { Entity } from '../../interfaces/types';
import { ModelConfig } from '../../interfaces/adminpanelConfig';

/**
 * FilterService - manages filter operations
 *
 * Key responsibilities:
 * - Check if filters are enabled for a model
 * - Apply saved filters to queries
 * - Integrate with ModernQueryBuilder
 * - Handle filter access control
 */
export class FilterService {
    constructor(private adminizer: Adminizer) {}

    /**
     * Get Entity object by model name
     * Similar to ControllerHelper.findEntityObject but without req dependency
     */
    private getEntityByModelName(modelName: string): Entity | null {
        const models = this.adminizer.config.models;
        if (!models) {
            return null;
        }

        // Find config (case-insensitive)
        const foundKey = Object.keys(models).find(
            key => key.toLowerCase() === modelName.toLowerCase()
        );

        if (!foundKey) {
            return null;
        }

        const config = models[foundKey] as ModelConfig;
        if (!config || typeof config === 'boolean') {
            return null;
        }

        // Get AbstractModel
        const model = this.adminizer.modelHandler.model.get(config.model);
        if (!model) {
            return null;
        }

        return {
            name: foundKey,
            config,
            model,
            uri: `${this.adminizer.config.routePrefix}/model/${foundKey}`,
            type: 'model'
        };
    }

    /**
     * Check if filters are enabled globally
     */
    isFiltersEnabled(): boolean {
        const config = this.adminizer.config as any;
        return config.filters?.enabled !== false;
    }

    /**
     * Check if filters are enabled for a specific model
     */
    isFiltersEnabledForModel(modelName: string): boolean {
        // Check global setting first
        if (!this.isFiltersEnabled()) {
            // Check if model has explicit override
            const config = this.adminizer.config as any;
            const modelConfig = config.modelFilters?.[modelName];
            return modelConfig?.enabled === true;
        }

        // Check model-specific override
        const config = this.adminizer.config as any;
        const modelConfig = config.modelFilters?.[modelName];

        // If explicitly disabled for this model
        if (modelConfig?.enabled === false) {
            return false;
        }

        return true;
    }

    /**
     * Check if legacy search should be used for a model
     */
    shouldUseLegacySearch(modelName: string): boolean {
        const config = this.adminizer.config as any;
        const modelConfig = config.modelFilters?.[modelName];
        return modelConfig?.useLegacySearch === true;
    }

    /**
     * Apply a saved filter to a query
     * @param filterId - Filter ID
     * @param model - Model to query
     * @param fields - Fields configuration
     * @param dataAccessor - DataAccessor instance
     * @param user - Current user (for access control)
     * @param options - Additional query options
     */
    async applyFilter(
        filterId: string,
        model: AbstractModel<any>,
        fields: Fields,
        dataAccessor: DataAccessor,
        user: UserAP,
        options?: {
            page?: number;
            limit?: number;
            sort?: string;
            sortDirection?: 'ASC' | 'DESC';
        }
    ): Promise<QueryResult> {
        // 1. Load filter
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        // 2. Check access
        if (!this.canViewFilter(filter, user)) {
            throw new Error('Access denied to this filter');
        }

        // 3. Convert filter conditions (handle datetime conversion)
        const convertedConditions = this.convertDatetimeConditions(filter.conditions || []);

        // 4. Convert to QueryParams
        const queryParams: QueryParams = {
            page: options?.page || 1,
            limit: options?.limit || 10,
            sort: options?.sort || filter.sortField || 'createdAt',
            sortDirection: options?.sortDirection || filter.sortDirection || 'DESC',
            filters: convertedConditions
        };

        // 4. Create QueryBuilder
        const queryBuilder = new ModernQueryBuilder(
            model,
            fields,
            dataAccessor,
            this.adminizer.filterCustomFieldHandler
        );

        // 5. Execute query
        return await queryBuilder.execute(queryParams);
    }

    /**
     * Get filter by ID with access control
     */
    async getFilterById(filterId: string, _user: UserAP): Promise<FilterAP | null> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        const filter = await filterModel["_findOne"]({ id: filterId });

        return filter as FilterAP | null;
    }

    /**
     * Get filters for a model accessible by user
     */
    async getFiltersForModel(
        modelName: string,
        user: UserAP,
        options?: {
            includePublic?: boolean;
            includeSystem?: boolean;
        }
    ): Promise<FilterAP[]> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        const filters: FilterAP[] = [];

        // Build base criteria
        const baseCriteria: any = { modelName };

        // 1. Get user's own filters
        const ownFilters = await filterModel["_find"]({
            ...baseCriteria,
            ownerId: user.id
        }) as FilterAP[];
        filters.push(...ownFilters);

        // 2. Get public filters (if requested)
        if (options?.includePublic !== false) {
            const publicFilters = await filterModel["_find"]({
                ...baseCriteria,
                visibility: 'public'
            }) as FilterAP[];

            // Deduplicate
            for (const filter of publicFilters) {
                if (!filters.find(f => f.id === filter.id)) {
                    filters.push(filter);
                }
            }
        }

        // 3. Get group filters if user has groups
        if (user.groups && user.groups.length > 0) {
            const groupIds = user.groups.map(g => g.id);

            const groupFilters = await filterModel["_find"]({
                ...baseCriteria,
                visibility: 'groups'
            }) as FilterAP[];

            // Check if user's groups intersect with filter's groups
            for (const filter of groupFilters) {
                if (filter.groupIds && filter.groupIds.some(gid => groupIds.includes(gid))) {
                    if (!filters.find(f => f.id === filter.id)) {
                        filters.push(filter);
                    }
                }
            }
        }

        // 4. Admin sees all filters
        if (user.isAdministrator) {
            const allFilters = await filterModel["_find"](baseCriteria) as FilterAP[];

            for (const filter of allFilters) {
                if (!filters.find(f => f.id === filter.id)) {
                    filters.push(filter);
                }
            }
        }

        if (!options?.includeSystem) {
            return filters.filter(f => f.visibility !== 'system');
        }

        return filters;
    }

    /**
     * Check if user can view a filter
     */
    canViewFilter(filter: FilterAP, user: UserAP): boolean {
        // Admin can view all
        if (user.isAdministrator) {
            return true;
        }

        // Owner can view
        if (filter.ownerId === user.id) {
            return true;
        }

        // Public filters
        if (filter.visibility === 'public') {
            return true;
        }

        // System filters (accessible via API)
        if (filter.visibility === 'system') {
            return true;
        }

        // Group filters
        if (filter.visibility === 'groups' && filter.groupIds && user.groups) {
            const userGroupIds = user.groups.map(g => g.id);
            return filter.groupIds.some(gid => userGroupIds.includes(gid));
        }

        return false;
    }

    /**
     * Check if user can edit a filter
     */
    canEditFilter(filter: FilterAP, user: UserAP): boolean {
        // Admin can edit all
        if (user.isAdministrator) {
            return true;
        }

        // Only owner can edit
        return filter.ownerId === user.id;
    }

    /**
     * Check if user can delete a filter
     */
    canDeleteFilter(filter: FilterAP, user: UserAP): boolean {
        return this.canEditFilter(filter, user);
    }

    /**
     * Count records matching a filter's conditions
     *
     * @param filter - Filter to count results for
     * @param user - User requesting the count (for access control)
     * @returns Number of matching records, or -1 on error
     */
    async countFilterResults(filter: FilterAP, user: UserAP): Promise<number> {
        try {
            const entity = this.getEntityByModelName(filter.modelName);
            if (!entity || !entity.model) {
                Adminizer.log.warn(`FilterService.countFilterResults: Model '${filter.modelName}' not found`);
                return -1;
            }

            const dataAccessor = new DataAccessor(this.adminizer, user, entity, 'list');
            const fields = dataAccessor.getFieldsConfig();

            // Convert datetime conditions to date ranges
            const convertedConditions = this.convertDatetimeConditions(filter.conditions || []);

            const queryParams: QueryParams = {
                page: 1,
                limit: 1, // We only need count
                filters: convertedConditions
            };

            const queryBuilder = new ModernQueryBuilder(
                entity.model,
                fields,
                dataAccessor,
                this.adminizer.filterCustomFieldHandler
            );
            const result = await queryBuilder.execute(queryParams);

            return result.filtered;
        } catch (error: any) {
            Adminizer.log.error(`FilterService.countFilterResults error for filter '${filter.id}':`, error);
            return -1;
        }
    }

    /**
     * Create a new filter
     */
    async createFilter(
        data: Partial<FilterAP>,
        user: UserAP
    ): Promise<FilterAP> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        // Generate UUID if not provided
        if (!data.id) {
            data.id = crypto.randomUUID();
        }

        // Set owner
        data.ownerId = user.id;

        // Set defaults
        data.visibility = data.visibility || 'private';
        data.version = data.version || 1;
        data.apiEnabled = data.apiEnabled || false;
        data.conditions = data.conditions || [];

        const filter = await filterModel["_create"](data);
        return filter as FilterAP;
    }

    /**
     * Update a filter
     */
    async updateFilter(
        filterId: string,
        data: Partial<FilterAP>,
        user: UserAP
    ): Promise<FilterAP> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canEditFilter(filter, user)) {
            throw new Error('Access denied');
        }

        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        // Don't allow changing owner
        delete data.ownerId;
        delete data.id;

        await filterModel["_updateOne"]({ id: filterId }, data);

        const updated = await this.getFilterById(filterId, user);
        if (!updated) {
            throw new Error(`Filter '${filterId}' not found after update`);
        }
        return updated;
    }

    /**
     * Delete a filter
     */
    async deleteFilter(filterId: string, user: UserAP): Promise<void> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canDeleteFilter(filter, user)) {
            throw new Error('Access denied');
        }

        // Debug: log before delete
        console.log('[FilterService.deleteFilter] Deleting filter:', filterId);
        console.log('[FilterService.deleteFilter] User ID:', user.id);

        // Delete columns first - find by filter association and delete by ID
        const columnModel = this.adminizer.modelHandler.model.get('filtercolumnap');
        if (columnModel) {
            // Find columns for this filter
            const columns = await columnModel["_find"]({ filter: filterId });
            console.log('[FilterService.deleteFilter] Found columns:', columns.length);
            
            // Delete each column by ID to avoid cascade issues
            for (const column of columns) {
                console.log('[FilterService.deleteFilter] Deleting column:', column.id);
                await columnModel["_destroyOne"]({ id: column.id });
            }
        }

        // Delete filter by ID only
        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (filterModel) {
            console.log('[FilterService.deleteFilter] Deleting filter:', filterId);
            // Use destroyOne with explicit ID to avoid cascade
            await filterModel["_destroyOne"]({ id: filterId });
            console.log('[FilterService.deleteFilter] Filter deleted successfully');
        }
        
        console.log('[FilterService.deleteFilter] Delete completed');
    }

    /**
     * Get columns for a filter
     */
    async getFilterColumns(filterId: string): Promise<FilterColumnAP[]> {
        const columnModel = this.adminizer.modelHandler.model.get('filtercolumnap');

        if (!columnModel) {
            return [];
        }

        const columns = await columnModel["_find"]({ filter: filterId });

        // Sort by order
        return (columns as FilterColumnAP[]).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    /**
     * Update columns for a filter (replace all)
     */
    async updateFilterColumns(
        filterId: string,
        columns: Partial<FilterColumnAP>[],
        user: UserAP
    ): Promise<FilterColumnAP[]> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canEditFilter(filter, user)) {
            throw new Error('Access denied');
        }

        const columnModel = this.adminizer.modelHandler.model.get('filtercolumnap');

        if (!columnModel) {
            throw new Error('FilterColumnAP model not found');
        }

        // Delete existing columns
        await columnModel["_destroy"]({ filter: filterId });

        // Create new columns
        if (columns.length > 0) {
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                await columnModel["_create"]({
                    filter: filterId,
                    fieldName: col.fieldName,
                    order: col.order ?? i
                });
            }
        }

        return this.getFilterColumns(filterId);
    }

    /**
     * Get filter with columns loaded
     */
    async getFilterWithColumns(filterId: string, user: UserAP): Promise<{
        filter: FilterAP | null;
        columns: FilterColumnAP[];
    }> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            return { filter: null, columns: [] };
        }

        if (!this.canViewFilter(filter, user)) {
            return { filter: null, columns: [] };
        }

        const columns = await this.getFilterColumns(filterId);

        return { filter, columns };
    }

    /**
     * Load and validate a filter, applying migrations if needed
     *
     * @param filterId - Filter ID to load
     * @param user - Current user
     * @param options - Validation options
     * @returns Filter with validation/migration result
     */
    async loadFilterWithValidation(
        filterId: string,
        user: UserAP,
        options: {
            autoMigrate?: boolean;
            saveAfterMigration?: boolean;
            strictValidation?: boolean;
        } = {}
    ): Promise<{
        filter: FilterAP | null;
        migration: MigrationResult & { validation: ValidationResult } | null;
        error?: string;
    }> {
        const { autoMigrate = true, saveAfterMigration = true, strictValidation = false } = options;

        // 1. Load raw filter
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            return { filter: null, migration: null, error: 'Filter not found' };
        }

        // 2. Check access
        if (!this.canViewFilter(filter, user)) {
            return { filter: null, migration: null, error: 'Access denied' };
        }

        // 3. Get fields config for the model
        const fieldsConfig = await this.getFieldsConfigForModel(filter.modelName);

        // 4. Validate and migrate
        const migrationResult = FilterMigrator.validateAndMigrate(filter, fieldsConfig, {
            autoMigrate,
            strictValidation
        });

        // 5. Save migrated filter if needed
        if (saveAfterMigration && migrationResult.migrated && this.canEditFilter(filter, user)) {
            try {
                await this.updateFilterRaw(filterId, {
                    conditions: migrationResult.filter.conditions,
                    version: CURRENT_FILTER_VERSION
                });
            } catch (error: any) {
                // Log but don't fail - migration save is best-effort
                Adminizer.log.warn(
                    `Failed to save migrated filter ${filterId}: ${error?.message || error}`
                );
            }
        }

        return {
            filter: migrationResult.filter,
            migration: migrationResult
        };
    }

    /**
     * Validate filter conditions without loading from DB
     *
     * @param conditions - Filter conditions to validate
     * @param modelName - Target model name
     * @returns Validation result
     */
    async validateConditions(
        conditions: FilterCondition[],
        modelName: string
    ): Promise<ValidationResult> {
        const fieldsConfig = await this.getFieldsConfigForModel(modelName);

        // Create a temporary filter for validation
        const tempFilter: FilterAP = {
            id: 'temp',
            name: 'temp',
            modelName,
            conditions,
            visibility: 'private',
            ownerId: 0,
            apiEnabled: false,
            version: CURRENT_FILTER_VERSION,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = FilterMigrator.validateAndMigrate(tempFilter, fieldsConfig);
        return result.validation;
    }

    /**
     * Get fields configuration for a model
     */
    private async getFieldsConfigForModel(modelName: string): Promise<Record<string, any> | undefined> {
        try {
            const entity = this.getEntityByModelName(modelName);
            if (!entity || !entity.model) {
                return undefined;
            }

            // Try to get fields from model configuration
            if (entity.config?.fields) {
                return entity.config.fields as Record<string, any>;
            }

            // Fallback: try to get from model attributes
            if (entity.model?.attributes) {
                return entity.model.attributes as Record<string, any>;
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Update filter without permission checks (internal use)
     */
    private async updateFilterRaw(
        filterId: string,
        data: Partial<FilterAP>
    ): Promise<void> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        await filterModel["_updateOne"]({ id: filterId }, data);
    }

    /**
     * Check if filter needs migration
     */
    filterNeedsMigration(filter: FilterAP): boolean {
        return FilterMigrator.needsMigration(filter);
    }

    /**
     * Get current filter schema version
     */
    getCurrentFilterVersion(): number {
        return CURRENT_FILTER_VERSION;
    }

    /**
     * Sanitize filter conditions (remove invalid/dangerous)
     *
     * @param conditions - Conditions to sanitize
     * @param modelName - Target model name
     * @param options - Sanitization options
     */
    async sanitizeConditions(
        conditions: FilterCondition[],
        modelName: string,
        options: {
            removeInvalid?: boolean;
            removeRawSQL?: boolean;
        } = {}
    ): Promise<{ conditions: FilterCondition[]; removed: string[] }> {
        const fieldsConfig = await this.getFieldsConfigForModel(modelName);

        if (!fieldsConfig) {
            return { conditions, removed: [] };
        }

        return FilterMigrator.sanitizeConditions(conditions, fieldsConfig, options);
    }

    /**
     * Convert datetime filter conditions from HTML5 format to UTC
     * HTML5 datetime-local returns "2026-03-17T23:41" WITHOUT timezone
     * Parse as UTC to match DB storage
     */
    private convertDatetimeConditions(conditions: FilterCondition[]): FilterCondition[] {
        return conditions.map(cond => {
            // Handle nested conditions recursively
            if (cond.children && cond.children.length > 0) {
                return {
                    ...cond,
                    children: this.convertDatetimeConditions(cond.children)
                };
            }

            // Skip non-datetime conditions
            if (!cond.field || !cond.value) {
                return cond;
            }

            // Skip operators that don't need conversion
            if (['isNull', 'isNotNull'].includes(cond.operator)) {
                return cond;
            }

            // Check if value looks like datetime-local format (YYYY-MM-DDTHH:mm)
            const valueStr = String(cond.value);
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valueStr)) {
                // Parse components manually and create UTC date
                const [datePart, timePart] = valueStr.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes] = timePart.split(':').map(Number);
                
                // For 'eq', create date range for the entire minute
                if (cond.operator === 'eq') {
                    const startOfMinute = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
                    const endOfMinute = new Date(Date.UTC(year, month - 1, day, hours, minutes, 59, 999));
                    return {
                        ...cond,
                        operator: 'between' as FilterOperator,
                        value: [startOfMinute, endOfMinute]
                    };
                }
                
                // For other operators (gt, gte, lt, lte, between), convert value to UTC
                const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
                return {
                    ...cond,
                    value: utcDate
                };
            }
            
            // Handle array values (for between operator with Date objects)
            if (Array.isArray(cond.value) && cond.value.length === 2) {
                const [val1, val2] = cond.value;
                // Check if values are datetime strings
                if (typeof val1 === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val1) &&
                    typeof val2 === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val2)) {
                    const [datePart1, timePart1] = val1.split('T');
                    const [year1, month1, day1] = datePart1.split('-').map(Number);
                    const [hours1, minutes1] = timePart1.split(':').map(Number);
                    const utcDate1 = new Date(Date.UTC(year1, month1 - 1, day1, hours1, minutes1, 0, 0));
                    
                    const [datePart2, timePart2] = val2.split('T');
                    const [year2, month2, day2] = datePart2.split('-').map(Number);
                    const [hours2, minutes2] = timePart2.split(':').map(Number);
                    const utcDate2 = new Date(Date.UTC(year2, month2 - 1, day2, hours2, minutes2, 0, 0));
                    
                    return {
                        ...cond,
                        value: [utcDate1, utcDate2]
                    };
                }
            }

            return cond;
        });
    }
}

export default FilterService;
