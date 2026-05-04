import { ControllerHelper } from "../../helpers/controllerHelper";
import { FilterService } from "../../lib/filters/FilterService";
import { FilterAP } from "../../models/FilterAP";
import { FilterColumnAP } from "../../models/FilterColumnAP";
import { Adminizer } from "../../lib/Adminizer";
import { GROUP_FILTER_VISIBILITY_TOKEN } from "../../policies/permissionResolvers";

/**
 * POST /adminizer/model/:model/filter/apply
 * Apply temporary filter (without saving) - stores filter in session keyed by model name
 */
export async function applyTemporaryFilter(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    const { name, conditions, columns } = req.body;

    if (!conditions || !Array.isArray(conditions)) {
        return res.status(400).send({ error: req.i18n.__('Conditions are required') });
    }

    // Store temporary filter in session keyed by model name
    if (req.session) {
        if (!req.session.temporaryFilters) {
            req.session.temporaryFilters = {};
        }
        req.session.temporaryFilters[entity.name] = {
            name: name || req.i18n.__('Temporary filter'),
            conditions,
            columns: columns || undefined
        };
    }

    return res.json({
        success: true,
        filterId: 'temporary',
        name: name || req.i18n.__('Temporary filter'),
        conditionCount: conditions.length
    });
}

/**
 * GET /adminizer/model/:model/filter/temporary
 * Returns temporary filter from server session.
 */
export async function getTemporaryFilter(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    const temporaryFilter = req.session?.temporaryFilters?.[entity.name];

    if (!temporaryFilter) {
        return res.status(404).send({ error: req.i18n.__('Temporary filter not found') });
    }

    return res.json({
        filter: {
            id: 'temporary',
            name: temporaryFilter.name,
            conditions: temporaryFilter.conditions || [],
            columns: temporaryFilter.columns || undefined
        }
    });
}

/**
 * GET /adminizer/model/:model/saved-filters
 * Returns list of saved filters for the model
 */
export async function getSavedFilters(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    const filterService = new FilterService(req.adminizer);

    // Get filters accessible by user (public filters for all users)
    const filters = await filterService.getFiltersForModel(entity.name, req.user, {
        includePublic: true,
        includeSystem: false
    });

    // Load owner info for each filter
    const userModel = req.adminizer.modelHandler.model.get('userap');
    const filtersWithOwner = await Promise.all(
        filters.map(async (filter) => {
            let ownerInfo = null;
            if (userModel && filter.ownerId) {
                try {
                    const owner = await userModel['_findOne']({ id: filter.ownerId });
                    if (owner) {
                        ownerInfo = {
                            id: owner.id,
                            login: owner.login,
                            fullName: owner.fullName
                        };
                    }
                } catch (e) {
                    // Ignore errors loading owner
                }
            }
            return {
                ...filter,
                ownerInfo
            };
        })
    );

    // Get result count for each filter
    const filtersWithCount = await Promise.all(
        filtersWithOwner.map(async (filter) => {
            const count = await filterService.countFilterResults(filter, req.user);
            return {
                ...filter,
                resultCount: count
            };
        })
    );

    return res.json({
        model: entity.name,
        filters: filtersWithCount
    });
}

/**
 * POST /adminizer/model/:model/filter
 * Create or update a saved filter
 */
export async function saveFilter(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    const { name, description, conditions, sortField, sortDirection, icon, color, filterId, columns, visibility, groupIds } = req.body;

    if (!name) {
        return res.status(400).send({ error: req.i18n.__('Filter name is required') });
    }

    if (!conditions || !Array.isArray(conditions)) {
        return res.status(400).send({ error: req.i18n.__('Filter conditions are required') });
    }

    // Determine visibility and groupIds
    const isAdmin = req.user?.isAdministrator === true;
    const canManageGroupVisibility =
        isAdmin || req.adminizer.accessRightsHelper.hasPermission(GROUP_FILTER_VISIBILITY_TOKEN, req.user);
    let effectiveVisibility: 'private' | 'public' | 'groups' = 'private';
    let effectiveGroupIds: number[] | undefined;

    if (visibility === 'public' && isAdmin) {
        effectiveVisibility = 'public';
    } else if (visibility === 'groups' && canManageGroupVisibility) {
        // Groups visibility: only if groupIds provided and user has access to those groups
        if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
            effectiveVisibility = 'groups';
            effectiveGroupIds = groupIds;
        } else {
            effectiveVisibility = 'private';
        }
    } else {
        effectiveVisibility = 'private';
    }

    const filterService = new FilterService(req.adminizer);

    try {
        // Check if filter with same name exists for this user
        const existingFilters = await filterService.getFiltersForModel(entity.name, req.user, {
            includePublic: false,
            includeSystem: false
        });

        const existingFilter = existingFilters.find(f => f.name === name && f.ownerId === req.user.id);

        if (existingFilter && !filterId) {
            // Filter with same name exists, ask for confirmation
            return res.status(409).json({
                error: req.i18n.__('Filter with this name already exists'),
                requiresConfirmation: true,
                existingFilter: {
                    id: existingFilter.id,
                    name: existingFilter.name
                }
            });
        }

        let filter: FilterAP;

        if (filterId && existingFilter && existingFilter.id === filterId) {
            // Update own existing filter - allow changing visibility
            const updateData: any = {
                name,
                description,
                conditions,
                sortField,
                sortDirection,
                icon,
                color,
                visibility: effectiveVisibility,
                groupIds: effectiveGroupIds
            };

            // If visibility changed to non-private, disable API feed
            const wasPrivate = existingFilter.visibility === 'private';
            const isNowPrivate = effectiveVisibility === 'private';
            if (wasPrivate && !isNowPrivate) {
                // Changed from private to non-private - disable feed
                updateData.apiEnabled = false;
                updateData.apiKey = undefined;
            } else if (!isNowPrivate) {
                // Not private - ensure feed is disabled
                updateData.apiEnabled = false;
                updateData.apiKey = undefined;
            }

            // Handle API access toggle - only allowed for private filters owned by current user
            const apiEnabled = req.body.apiEnabled === true;
            const isOwner = existingFilter.ownerId === req.user.id;
            const isPrivate = effectiveVisibility === 'private';

            // API feed can only be enabled for private filters owned by the current user
            if (isPrivate && isOwner && apiEnabled) {
                updateData.apiEnabled = true;
                // Regenerate key if requested
                if (req.body.regenerateApiKey) {
                    updateData.apiKey = crypto.randomUUID();
                } else if (!existingFilter.apiKey) {
                    // Generate key if enabling for first time
                    updateData.apiKey = crypto.randomUUID();
                } else {
                    // Keep existing key
                    updateData.apiKey = existingFilter.apiKey;
                }
            }

            filter = await filterService.updateFilter(filterId, updateData, req.user);
        } else if (filterId) {
            // Update someone else's filter - preserve original visibility
            // First get the original filter to preserve its visibility settings
            const originalFilter = await filterService.getFilterById(filterId, req.user);
            if (!originalFilter) {
                return res.status(404).json({ error: req.i18n.__('Filter not found') });
            }

            filter = await filterService.updateFilter(filterId, {
                name,
                description,
                conditions,
                sortField,
                sortDirection,
                icon,
                color,
                // Preserve original visibility - don't allow changing someone else's filter visibility
                visibility: originalFilter.visibility,
                groupIds: originalFilter.groupIds
            }, req.user);
        } else {
            // Create new filter
            filter = await filterService.createFilter({
                id: crypto.randomUUID(),
                name,
                description,
                modelName: entity.name,
                conditions,
                sortField,
                sortDirection,
                icon,
                color,
                visibility: effectiveVisibility,
                groupIds: effectiveGroupIds,
                ownerId: req.user.id,
                apiEnabled: false,
                version: 1
            }, req.user);
        }

        // Save columns if provided
        if (columns && Array.isArray(columns)) {
            const filterColumns: Partial<FilterColumnAP>[] = columns.map((col: any, index: number) => ({
                fieldName: col.fieldName,
                order: col.order !== undefined ? col.order : index
            }));
            await filterService.updateFilterColumns(filter.id, filterColumns, req.user);
        }

        // Get result count
        const count = await filterService.countFilterResults(filter, req.user);

        return res.json({
            success: true,
            filter: {
                ...filter,
                resultCount: count
            }
        });
    } catch (error: any) {
        Adminizer.log.error('Error saving filter:', error);
        return res.status(500).json({
            error: req.i18n.__('Failed to save filter'),
            message: error.message
        });
    }
}

/**
 * DELETE /adminizer/model/:model/filter/:id
 * Delete a saved filter
 */
export async function deleteFilter(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    const filterId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    if (!filterId || filterId === 'undefined' || filterId === 'null') {
        return res.status(400).send({ error: req.i18n.__('Filter ID is required') });
    }

    const filterService = new FilterService(req.adminizer);

    try {
        Adminizer.log.debug(`Deleting filter: ${filterId}`);
        await filterService.deleteFilter(filterId, req.user);

        // Return identical response to prevent filter existence/ownership enumeration.
        return res.status(204).send();
    } catch (error: any) {
        const errorMessage = typeof error?.message === 'string'
            ? error.message.toLowerCase()
            : '';
        const isNotFound = errorMessage.includes('not found');
        const isAccessDenied = errorMessage.includes('access denied');

        // Fail closed without disclosing whether the filter exists or belongs to another user.
        if (isNotFound || isAccessDenied) {
            Adminizer.log.debug(`Filter delete suppressed for id=${filterId}: not found or access denied`);
            return res.status(204).send();
        }
        
        Adminizer.log.error('Error deleting filter:', error);
        return res.status(500).json({
            error: req.i18n.__('Failed to delete filter'),
            message: error.message
        });
    }
}
