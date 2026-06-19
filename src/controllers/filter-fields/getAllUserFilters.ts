import { FilterService } from "../../lib/filters/FilterService";
import { Adminizer } from "../../lib/Adminizer";

/**
 * GET /adminizer/api/all-user-filters
 * Returns all filters accessible to the current user across all models.
 * Supports search by name, filter by modelName, and pagination.
 */
export async function getAllUserFilters(req: ReqType, res: ResType) {
    const filterService = new FilterService(req.adminizer);
    const userModel = req.adminizer.modelHandler.model.get('User');
    const groupModel = req.adminizer.modelHandler.model.get('Group');

    // Cache for group names: { groupId: groupName }
    const groupNamesCache: Record<number, string> = {};

    const getGroupName = async (groupId: number): Promise<string> => {
        if (groupNamesCache[groupId]) return groupNamesCache[groupId];
        try {
            const group = await groupModel?.['_findOne']({where: {id: groupId}});
            if (group) {
                groupNamesCache[groupId] = group.name || String(groupId);
                return groupNamesCache[groupId];
            }
        } catch (e) { /* ignore */ }
        groupNamesCache[groupId] = String(groupId);
        return groupNamesCache[groupId];
    };

    // Extract query parameters
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const modelNameFilter = typeof req.query.modelName === 'string' ? req.query.modelName : undefined;
    const offset = parseInt(String(req.query.offset || 0), 10) || 0;
    const limit = parseInt(String(req.query.limit || 50), 10) || 50;

    // Get all models from config
    const allModels = req.adminizer.config.models || {};
    const modelNames = Object.keys(allModels);

    // Determine which models to query
    const modelsToQuery = modelNameFilter
        ? modelNames.filter(name => name === modelNameFilter)
        : modelNames;

    // Collect all filters from all models
    const allFilters: Array<{
        id: string;
        name: string;
        modelName: string;
        modelTitle: string;
        visibility: string;
        apiEnabled: boolean;
        ownerId: number;
        ownerName?: string;
        isOwner: boolean;
        groupNames?: string[];
    }> = [];

    for (const modelName of modelsToQuery) {
        try {
            const filters = await filterService.getFiltersForModel(modelName, req.user, {
                includePublic: true,
                includeSystem: false
            });

            const modelConfig = allModels[modelName];
            const modelTitle = modelConfig?.title || modelName;

            for (const filter of filters) {
                // Load owner info
                let ownerName: string | undefined;
                if (userModel && filter.ownerId) {
                    try {
                        const owner = await userModel['_findOne']({where: {id: filter.ownerId}});
                        if (owner) {
                            ownerName = owner.fullName || owner.login || String(owner.id);
                        }
                    } catch (e) {
                        // Ignore owner load errors
                    }
                }

                // Load group names for 'groups' visibility
                let groupNames: string[] | undefined;
                if (filter.visibility === 'groups' && filter.groupIds && filter.groupIds.length > 0) {
                    groupNames = [];
                    for (const gid of filter.groupIds) {
                        const gName = await getGroupName(gid);
                        groupNames.push(gName);
                    }
                }

                allFilters.push({
                    id: filter.id,
                    name: filter.name,
                    modelName: filter.modelName,
                    modelTitle,
                    visibility: filter.visibility,
                    apiEnabled: filter.apiEnabled === true,
                    ownerId: filter.ownerId,
                    ownerName,
                    isOwner: filter.ownerId === req.user?.id,
                    groupNames
                });
            }
        } catch (e) {
            Adminizer.log.debug(`Error loading filters for model ${modelName}:`, e);
        }
    }

    // Apply search filter (by name, case-insensitive)
    let filteredFilters = allFilters;
    if (search) {
        const searchLower = search.toLowerCase();
        filteredFilters = allFilters.filter(f =>
            f.name.toLowerCase().includes(searchLower)
        );
    }

    // Calculate pagination
    const total = filteredFilters.length;
    const paginatedFilters = filteredFilters.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Build models list for frontend dropdown
    const modelsList = modelNames.map(name => {
        const config = allModels[name];
        return {
            name,
            title: config?.title || name
        };
    });

    return res.json({
        filters: paginatedFilters,
        models: modelsList,
        total,
        hasMore
    });
}
