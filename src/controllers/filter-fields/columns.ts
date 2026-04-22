import { ControllerHelper } from "../../helpers/controllerHelper";
import { DataAccessor } from "../../lib/DataAccessor";
import { FilterService } from "../../lib/filters/FilterService";
import { FilterAP } from "../../models/FilterAP";
import { FilterColumnAP } from "../../models/FilterColumnAP";

/**
 * GET /adminizer/model/:model/columns
 * Returns available columns for the model (considering DataAccessor rights)
 * Also returns columns for a specific filter if filterId is provided
 */
export async function getModelColumns(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: 'Model not found' });
    }

    // Check access
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.status(403).send({ error: 'Forbidden' });
        }
    }

    // Get available fields from DataAccessor (respects user permissions)
    const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    const fields = dataAccessor.getFieldsConfig();

    // Convert fields to column format
    const availableColumns = Object.entries(fields).map(([fieldName, field]) => {
        // Get label and type from config
        const config = typeof field.config === 'object' ? field.config : null;
        const label = config?.title || fieldName;
        const type = config?.type || 'string';

        return {
            fieldName,
            label,
            type,
            order: 0
        };
    });

    // If filterId provided, also return filter's column configuration
    const filterId = req.query.filterId ? req.query.filterId.toString() : undefined;
    let filterColumns: FilterColumnAP[] = [];

    if (filterId && filterId !== 'temporary') {
        try {
            const filterService = new FilterService(req.adminizer);
            const result = await filterService.getFilterWithColumns(filterId, req.user);
            if (result.filter) {
                filterColumns = result.columns;
            }
        } catch (err) {
            // Ignore errors, return available columns without filter config
        }
    } else if (filterId === 'temporary') {
        // Get temporary filter columns from session
        if (req.session?.temporaryFilters?.[entity.name]?.columns) {
            const tempColumns = req.session.temporaryFilters[entity.name].columns;
            filterColumns = tempColumns.map((col: any, index: number) => ({
                id: index + 1,
                filter: 'temporary',
                fieldName: col.fieldName,
                order: col.order !== undefined ? col.order : index
            } as FilterColumnAP));
        }
    }

    return res.json({
        model: entity.name,
        availableColumns,
        filterColumns: filterColumns,
        hasFilterConfig: filterColumns.length > 0
    });
}

/**
 * POST /adminizer/model/:model/filter/:filterId/columns
 * Update column configuration for a specific filter
 */
export async function updateFilterColumns(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: 'Model not found' });
    }

    // Check access
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.status(403).send({ error: 'Forbidden' });
        }
    }

    const filterId = req.params.filterId ? String(req.params.filterId) : undefined;

    if (!filterId) {
        return res.status(400).send({ error: 'Filter ID is required' });
    }

    const { columns } = req.body;

    if (!columns || !Array.isArray(columns)) {
        return res.status(400).send({ error: 'Columns array is required' });
    }

    const filterService = new FilterService(req.adminizer);

    try {
        // Validate filter exists and user has access
        const filter = await filterService.getFilterById(filterId, req.user);

        if (!filter) {
            return res.status(404).send({ error: 'Filter not found or access denied' });
        }

        // Convert frontend column format to FilterColumnAP format
        const filterColumns: Partial<FilterColumnAP>[] = columns.map((col: any, index: number) => ({
            fieldName: col.fieldName,
            order: col.order !== undefined ? col.order : index
        }));

        // Save columns
        const result = await filterService.updateFilterColumns(filterId, filterColumns, req.user);

        return res.json({
            success: true,
            columns: result
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to update filter columns',
            message: error.message
        });
    }
}
