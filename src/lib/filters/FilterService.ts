import { Adminizer } from '../Adminizer';
import { DataAccessor } from '../DataAccessor';
import { ListQueryBuilder } from '../list-query-builder/ListQueryBuilder';
import { FilterAP, FilterCondition } from '../../models/FilterAP';
import { FilterColumnAP } from '../../models/FilterColumnAP';
import { UserAP } from '../../models/UserAP';
import { Entity } from '../../interfaces/types';
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
            uri: `${this.adminizer.config.routePrefix}/model/${foundKey}`
        };
    }



    /**
     * Get filter by ID with access control
     * Returns null when filter is not found or user has no access.
     */
    async getFilterById(filterId: string, user: UserAP): Promise<FilterAP | null> {
        const filterModel = this.adminizer.modelHandler.internal('filters').get<FilterAP>('FilterAP');
        const filter = await filterModel.findOne({where: {id: filterId}});

        if (!filter) {
            return null;
        }

        const filterAP = filter as FilterAP;
        if (!this.canViewFilter(filterAP, user)) {
            return null;
        }

        return filterAP;
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
        const filterModel = this.adminizer.modelHandler.internal('filters').get<FilterAP>('FilterAP');

        const filters: FilterAP[] = [];

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
            const convertedConditions = convertDatetimeConditions(filter.conditions || []);

            const queryParams: ListQueryBuilderParams = {
                page: 1,
                limit: 1, // We only need count
                filters: convertedConditions
            };

            const listQueryBuilder = new ListQueryBuilder(
                entity.model,
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
        data: Partial<FilterAP>,
        user: UserAP
    ): Promise<FilterAP> {
        const filterModel = this.adminizer.modelHandler.internal('filters').get<FilterAP>('FilterAP');

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

        return await filterModel.create(data);
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

        const filterModel = this.adminizer.modelHandler.internal('filters').get<FilterAP>('FilterAP');

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
    async deleteFilter(filterId: string, user: UserAP): Promise<void> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canDeleteFilter(filter, user)) {
            throw new Error('Access denied');
        }

        // Delete columns first - find by filter association and delete by ID
        const columnModel = this.adminizer.modelHandler.internal('filters').get<FilterColumnAP>('FilterColumnAP');
        if (columnModel) {
            // Find columns for this filter
            const columns = await columnModel.find({where: {filter: filterId}});
            
            // Delete each column by ID to avoid cascade issues
            for (const column of columns) {
                await columnModel.destroyOne({where: {id: column.id}});
            }
        }

        // Delete filter by ID only
        const filterModel = this.adminizer.modelHandler.internal('filters').get<FilterAP>('FilterAP');
        if (filterModel) {
            // Use destroyOne with explicit ID to avoid cascade
            await filterModel.destroyOne({where: {id: filterId}});
        }
        
    }

    /**
     * Get columns for a filter
     */
    async getFilterColumns(filterId: string): Promise<FilterColumnAP[]> {
        const columnModel = this.adminizer.modelHandler.internal('filters').get<FilterColumnAP>('FilterColumnAP');

        const columns = await columnModel.find({where: {filter: filterId}});

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

        const columnModel = this.adminizer.modelHandler.internal('filters').get<FilterColumnAP>('FilterColumnAP');

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
    async getFilterWithColumns(filterId: string, user: UserAP): Promise<{ filter: FilterAP | null; columns: FilterColumnAP[];}> {
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
