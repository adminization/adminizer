import { ControllerHelper } from "../../helpers/controllerHelper";
import { DataAccessor } from "../../lib/DataAccessor";
import { FilterService } from "../../lib/filters/FilterService";
import { Filter } from "../../models/Filter";
import { FilterColumn } from "../../models/FilterColumn";

/**
 * GET /adminizer/model/:model/columns
 * Returns available columns for the model (considering DataAccessor rights)
 * Also returns columns for a specific filter if filterId is provided
 */
export async function getModelColumns(req: ReqType, res: ResType) {
    const modelResource = ControllerHelper.findModelResource(req);

    if (!modelResource.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    // Get available fields from DataAccessor (respects user permissions)
    const dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "list");
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
    let filterColumns: FilterColumn[] = [];

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
        if (req.session?.temporaryFilters?.[modelResource.name]?.columns) {
            const tempColumns = req.session.temporaryFilters[modelResource.name].columns;
            filterColumns = tempColumns.map((col: any, index: number) => ({
                id: index + 1,
                filter: 'temporary',
                fieldName: col.fieldName,
                order: col.order !== undefined ? col.order : index
            } as FilterColumn));
        }
    }

    return res.json({
        model: modelResource.name,
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
    const modelResource = ControllerHelper.findModelResource(req);

    if (!modelResource.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    const filterId = req.params.filterId ? String(req.params.filterId) : undefined;

    if (!filterId) {
        return res.status(400).send({ error: req.i18n.__('Filter ID is required') });
    }

    const { columns } = req.body;

    if (!columns || !Array.isArray(columns)) {
        return res.status(400).send({ error: req.i18n.__('Columns array is required') });
    }

    const filterService = new FilterService(req.adminizer);

    try {
        // Validate filter exists and user has access
        const filter = await filterService.getFilterById(filterId, req.user);

        if (!filter) {
            return res.status(404).send({ error: req.i18n.__('Filter not found or access denied') });
        }

        // Convert frontend column format to FilterColumn format
        const filterColumns: Partial<FilterColumn>[] = columns.map((col: any, index: number) => ({
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
            error: req.i18n.__('Failed to update filter columns'),
            message: error.message
        });
    }
}


