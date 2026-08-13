import { Adminizer } from '../Adminizer';
import { DataAccessor } from '../DataAccessor';
import { ListQueryBuilder } from '../list-query-builder/ListQueryBuilder';
import { Filter, FilterCondition } from '../../models/Filter';
import { FilterColumn } from '../../models/FilterColumn';
import { User } from '../../models/User';
import { ModelResource } from '../../interfaces/types';
import { ModelConfig, ModelFiltersConfig } from '../../interfaces/adminpanelConfig';
import { convertDatetimeConditions } from '../../helpers/filterDatetimeHelper';
import { ListQueryBuilderParams } from '../../interfaces/listQueryBuilder';

/**
 * FilterService - manages filter operations
 *
 * Key responsibilities:
 * - Check if filters are enabled for a model
 * - Apply saved filters to queries
 * - Integrate with ListQueryBuilder
 * - Handle filter access control
 */
export class FilterService {
    constructor(private adminizer: Adminizer) {}

    /**
     * Get ModelResource object by model name
     * Similar to ControllerHelper.findModelResource but without req dependency
     */
    private getModelResourceByModelName(modelName: string): ModelResource | null {
        const models = this.adminizer.config.models;
        if (!models) {
            return null;
        }

        const foundKey = Object.prototype.hasOwnProperty.call(models, modelName)
            ? modelName
            : Object.keys(models).find(key => key.toLowerCase() === modelName.toLowerCase());

        if (!foundKey) {
            return null;
        }

        const config = models[foundKey] as ModelConfig;
        if (!config || typeof config === 'boolean') {
            return null;
        }

        // Get AbstractModel
        const model = this.adminizer.modelHandler.getResource(foundKey);
        if (!model) {
            return null;
        }

        return {
            name: foundKey,
            config,
            model,
            uri: `${this.adminizer.config.routePrefix}/model/${foundKey}`
        };
    }



    /**
     * Get filter by ID with access control
     * Returns null when filter is not found or user has no access.
     */
    async getFilterById(filterId: string, user: User): Promise<Filter | null> {
        const filterModel = this.adminizer.modelHandler.internal('filters').get<Filter>('Filter');
        const filter = await filterModel.findOne({where: {id: filterId}});

        if (!filter) {
            return null;
        }

        const savedFilter = filter as Filter;
        if (!this.canViewFilter(savedFilter, user)) {
            return null;
        }

        return savedFilter;
    }

    /**
     * Get filters for a model accessible by user
     */
    async getFiltersForModel(
        modelName: string,
        user: User,
        options?: {
            includePublic?: boolean;
            includeSystem?: boolean;
        }
    ): Promise<Filter[]> {
        const filterModel = this.adminizer.modelHandler.internal('filters').get<Filter>('Filter');

        const filters: Filter[] = [];

        // Build base criteria
        const baseCriteria: any = { modelName };

        // 1. Get user's own filters
        const ownFilters = await filterModel.find({
            where: {
                ...baseCriteria,
                ownerId: user.id
            }
        });
        filters.push(...ownFilters);

        // 2. Get public filters (if requested)
        if (options?.includePublic !== false) {
            const publicFilters = await filterModel.find({
                where: {
                    ...baseCriteria,
                    visibility: 'public'
                }
            });

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

            const groupFilters = await filterModel.find({
                where: {
                    ...baseCriteria,
                    visibility: 'groups'
                }
            });

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
            const allFilters = await filterModel.find({where: baseCriteria});

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
    canViewFilter(filter: Filter, user: User): boolean {
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
    canEditFilter(filter: Filter, user: User): boolean {
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
    canDeleteFilter(filter: Filter, user: User): boolean {
        return this.canEditFilter(filter, user);
    }

    /**
     * Count records matching a filter's conditions
     *
     * @param filter - Filter to count results for
     * @param user - User requesting the count (for access control)
     * @returns Number of matching records, or -1 on error
     */
    async countFilterResults(filter: Filter, user: User): Promise<number> {
        try {
            const modelResource = this.getModelResourceByModelName(filter.modelName);
            if (!modelResource || !modelResource.model) {
                Adminizer.log.warn(`FilterService.countFilterResults: Model '${filter.modelName}' not found`);
                return -1;
            }

            const dataAccessor = new DataAccessor(this.adminizer, user, modelResource, 'list');
            const fields = dataAccessor.getFieldsConfig();

            // Convert datetime conditions to date ranges
            const convertedConditions = convertDatetimeConditions(filter.conditions || []);

            const queryParams: ListQueryBuilderParams = {
                page: 1,
                limit: 1, // We only need count
                filters: convertedConditions
            };

            const listQueryBuilder = new ListQueryBuilder(
                modelResource.model,
                fields,
                dataAccessor,
                this.adminizer.customFilterHandler
            );
            const result = await listQueryBuilder.execute(queryParams);

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
        data: Partial<Filter>,
        user: User
    ): Promise<Filter> {
        const filterModel = this.adminizer.modelHandler.internal('filters').get<Filter>('Filter');

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

        return await filterModel.create(data as Filter);
    }

    /**
     * Update a filter
     */
    async updateFilter(
        filterId: string,
        data: Partial<Filter>,
        user: User
    ): Promise<Filter> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canEditFilter(filter, user)) {
            throw new Error('Access denied');
        }

        const filterModel = this.adminizer.modelHandler.internal('filters').get<Filter>('Filter');

        // Don't allow changing owner
        delete data.ownerId;
        delete data.id;

        await filterModel.updateOne({where: {id: filterId}}, data);

        const updated = await this.getFilterById(filterId, user);
        if (!updated) {
            throw new Error(`Filter '${filterId}' not found after update`);
        }
        return updated;
    }

    /**
     * Delete a filter
     */
    async deleteFilter(filterId: string, user: User): Promise<void> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canDeleteFilter(filter, user)) {
            throw new Error('Access denied');
        }

        // Delete columns first - find by filter association and delete by ID
        const columnModel = this.adminizer.modelHandler.internal('filters').get<FilterColumn>('FilterColumn');
        if (columnModel) {
            // Find columns for this filter
            const columns = await columnModel.find({where: {filter: filterId}});
            
            // Delete each column by ID to avoid cascade issues
            for (const column of columns) {
                await columnModel.destroyOne({where: {id: column.id}});
            }
        }

        // Delete filter by ID only
        const filterModel = this.adminizer.modelHandler.internal('filters').get<Filter>('Filter');
        if (filterModel) {
            // Use destroyOne with explicit ID to avoid cascade
            await filterModel.destroyOne({where: {id: filterId}});
        }
        
    }

    /**
     * Get columns for a filter
     */
    async getFilterColumns(filterId: string): Promise<FilterColumn[]> {
        const columnModel = this.adminizer.modelHandler.internal('filters').get<FilterColumn>('FilterColumn');

        const columns = await columnModel.find({where: {filter: filterId}});

        // Sort by order
        return (columns as FilterColumn[]).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    /**
     * Update columns for a filter (replace all)
     */
    async updateFilterColumns(
        filterId: string,
        columns: Partial<FilterColumn>[],
        user: User
    ): Promise<FilterColumn[]> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canEditFilter(filter, user)) {
            throw new Error('Access denied');
        }

        const columnModel = this.adminizer.modelHandler.internal('filters').get<FilterColumn>('FilterColumn');

        // Delete existing columns
        await columnModel.destroy({where: {filter: filterId}});

        // Create new columns
        if (columns.length > 0) {
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                await columnModel.create({
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
    async getFilterWithColumns(filterId: string, user: User): Promise<{ filter: Filter | null; columns: FilterColumn[];}> {
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
}

export default FilterService;


