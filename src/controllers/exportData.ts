import { ControllerHelper } from "../helpers/controllerHelper";
import { DataAccessor } from "../lib/DataAccessor";
import { ModernQueryBuilder, QueryParams } from "../lib/query-builder/ModernQueryBuilder";
import { Adminizer } from "../lib/Adminizer";
import { Field, Fields } from "../helpers/fieldsHelper";
import { FilterCondition } from "../models/FilterAP";
import { FilterColumnAP } from "../models/FilterColumnAP";
import { FilterService } from "../lib/filters/FilterService";

/**
 * Convert datetime filter conditions from HTML5 format to UTC
 * (Same logic as in list.ts)
 */
function convertDatetimeConditions(conditions: FilterCondition[]): FilterCondition[] {
    return conditions
        .filter(cond => {
            // IMPORTANT: boolean false is a valid value and should NOT be filtered out
            if (cond.operator !== 'isNull' && cond.operator !== 'isNotNull' && cond.operator !== 'today') {
                if (cond.value === undefined || cond.value === null || cond.value === '') {
                    return false;
                }
                if (Array.isArray(cond.value) && cond.value.length === 0) {
                    return false;
                }
            }
            return true;
        })
        .map(cond => {
            if (cond.children && cond.children.length > 0) {
                return {
                    ...cond,
                    children: convertDatetimeConditions(cond.children)
                };
            }

            // IMPORTANT: boolean false is valid, so check for undefined/null only
            if (!cond.field || cond.value === undefined || cond.value === null || cond.value === '') {
                return cond;
            }

            if (['isNull', 'isNotNull'].includes(cond.operator)) {
                return cond;
            }

            const valueStr = String(cond.value);
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valueStr)) {
                const [datePart, timePart] = valueStr.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes] = timePart.split(':').map(Number);

                if (cond.operator === 'eq') {
                    const startOfMinute = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
                    const endOfMinute = new Date(Date.UTC(year, month - 1, day, hours, minutes, 59, 999));
                    return {
                        ...cond,
                        operator: 'between' as FilterCondition['operator'],
                        value: [startOfMinute, endOfMinute]
                    };
                }

                const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
                return {
                    ...cond,
                    value: utcDate
                };
            }

            if (Array.isArray(cond.value) && cond.value.length === 2) {
                const [val1, val2] = cond.value;
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

/**
 * Export format types
 */
type ExportFormat = 'json' | 'csv' | 'xlsx';

/**
 * Main export controller
 * POST /adminizer/model/:model/export
 * Body: { filterId, format, fields }
 */
export default async function exportData(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).json({ error: 'Model not found' });
    }

    // Check access
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    const { filterId, format, selectedFields: bodySelectedFields } = req.body as {
        filterId?: string;
        format?: ExportFormat;
        selectedFields?: string[];
    };

    // Validate format
    const exportFormat = (format as ExportFormat) || 'json';
    if (!['json', 'csv', 'xlsx'].includes(exportFormat)) {
        return res.status(400).json({ error: 'Invalid export format. Supported: json, csv, xlsx' });
    }

    const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    const fields = dataAccessor.getFieldsConfig();

    // Load filter if provided
    let filters: FilterCondition[] = [];
    let savedColumns: FilterColumnAP[] = [];

    if (filterId) {
        try {
            if (filterId === 'temporary' && req.session?.temporaryFilters?.[entity.name]) {
                const tempFilter = req.session.temporaryFilters[entity.name];
                filters = convertDatetimeConditions(tempFilter.conditions || []);
                if (tempFilter.columns && Array.isArray(tempFilter.columns)) {
                    savedColumns = tempFilter.columns.map((col: any, index: number) => ({
                        id: index + 1,
                        filter: 'temporary',
                        fieldName: col.fieldName,
                        order: col.order !== undefined ? col.order : index
                    } as FilterColumnAP));
                }
            } else if (filterId !== 'temporary') {
                const filterService = new FilterService(req.adminizer);
                const result = await filterService.getFilterWithColumns(filterId, req.user);
                if (result.filter && result.filter.conditions) {
                    filters = convertDatetimeConditions(result.filter.conditions);
                }
                savedColumns = result.columns || [];
            }
        } catch (err) {
            Adminizer.log.error('Error loading filter for export:', err);
            return res.status(500).json({ error: 'Error loading filter' });
        }
    }

    // Determine fields to export
    let displayFields = fields;

    // Apply selected fields from request body
    if (bodySelectedFields && Array.isArray(bodySelectedFields) && bodySelectedFields.length > 0) {
        const validFields = bodySelectedFields.filter(f => fields[f]);
        if (validFields.length > 0) {
            displayFields = validFields.reduce((acc: Fields, key: string) => {
                if (fields[key]) {
                    acc[key] = fields[key];
                }
                return acc;
            }, {} as Fields);
        }
    }

    // Apply custom columns from filter
    if (savedColumns.length > 0) {
        displayFields = applyCustomColumnsForExport(displayFields, savedColumns);
    }

    // Fetch ALL data (no pagination)
    const queryParams: QueryParams = {
        page: 1,
        limit: 100000, // Large limit to get all records
        filters: filters.length > 0 ? filters : undefined,
        sort: 'id',
        sortDirection: 'ASC',
        fields: Object.keys(displayFields)
    };

    const queryBuilder = new ModernQueryBuilder(
        entity.model,
        fields,
        dataAccessor,
        req.adminizer.filterCustomFieldHandler
    );

    try {
        const result = await queryBuilder.execute(queryParams);
        const records = result.data;

        // Prepare human-readable data for export
        const exportData = prepareExportData(records, displayFields, req);

        // Generate file based on format
        switch (exportFormat) {
            case 'json':
                return sendJsonExport(res, exportData, entity.name);
            case 'csv':
                return sendCsvExport(res, exportData, entity.name, displayFields, req);
            case 'xlsx':
                return sendXlsxExport(res, exportData, entity.name, displayFields, req);
            default:
                return res.status(400).json({ error: 'Invalid export format' });
        }
    } catch (err) {
        Adminizer.log.error('Export error:', err);
        return res.status(500).json({ error: 'Export failed', message: (err as Error).message });
    }
}

/**
 * Apply custom column configuration for export
 */
function applyCustomColumnsForExport(fields: Fields, columns: FilterColumnAP[]): Fields {
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    const visibleColumns = sortedColumns.filter(col => fields[col.fieldName]);

    if (visibleColumns.length === 0) {
        return fields;
    }

    const result: Fields = {};
    for (const col of visibleColumns) {
        if (fields[col.fieldName]) {
            result[col.fieldName] = fields[col.fieldName];
        }
    }
    return result;
}

/**
 * Prepare data for export - convert values to human-readable format
 */
function prepareExportData(
    records: any[],
    displayFields: Fields,
    req: ReqType
): Record<string, any>[] {
    return records.map(record => {
        const row: Record<string, any> = {};

        for (const [key, field] of Object.entries(displayFields)) {
            const fieldConfig = field as Field;
            const config = fieldConfig.config;
            const title = (typeof config === 'object' && config !== null && config.title)
                ? req.i18n.__(config.title)
                : key;
            const value = record[key];

            // Format value based on field type
            row[title] = formatExportValue(value, fieldConfig);
        }

        return row;
    });
}

/**
 * Format value for export based on type
 */
function formatExportValue(value: any, field: Field): string | number | boolean | null {
    if (value === null || value === undefined) {
        return '';
    }

    const fieldType = field.model?.type as string | undefined;

    // Handle relationships
    if (field.model?.model) {
        const displayField = field.modelConfig?.titleField ??
            (typeof value === 'object' && value ? (value.title || value.name || value.id) : value);
        return typeof displayField === 'object' ? JSON.stringify(displayField) : String(displayField);
    }

    // Handle associations (hasMany)
    if (fieldType === 'association-many' || fieldType === 'association') {
        if (Array.isArray(value)) {
            return value.map((item: any) => {
                if (typeof item === 'object' && item) {
                    return item.title || item.name || item.id || JSON.stringify(item);
                }
                return String(item);
            }).join(', ');
        }
        return String(value);
    }

    // Handle JSON fields
    if (fieldType === 'json') {
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }

    // Handle boolean
    if (fieldType === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    // Handle dates
    if (fieldType === 'date' || fieldType === 'datetime') {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return String(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.join(', ');
    }

    // Default: convert to string
    return String(value);
}

/**
 * Send JSON export response
 */
function sendJsonExport(res: ResType, data: Record<string, any>[], modelName: string) {
    const filename = `${modelName}_export_${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(JSON.stringify(data, null, 2)));

    return res.json(data);
}

/**
 * Escape value for CSV
 */
function escapeCsvValue(value: string | number | boolean | null): string {
    if (value === null || value === undefined) {
        return '';
    }

    const str = String(value);

    // If value contains comma, newline, or quote, wrap in quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Send CSV export response
 */
function sendCsvExport(res: ResType, data: Record<string, any>[], modelName: string, fields: Fields, req: ReqType) {
    const filename = `${modelName}_export_${Date.now()}.csv`;

    // Get headers (preserve order from fields)
    const headers = Object.keys(fields).map(key => {
        const field = fields[key] as Field;
        const config = field.config;
        return (typeof config === 'object' && config !== null && config.title)
            ? req.i18n.__(config.title)
            : key;
    });

    // Build CSV content
    const csvRows: string[] = [];

    // Add BOM for Excel compatibility with UTF-8
    const bom = '\uFEFF';

    // Header row
    csvRows.push(headers.map(h => escapeCsvValue(h)).join(','));

    // Data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            return escapeCsvValue(value);
        });
        csvRows.push(values.join(','));
    }

    const csvContent = bom + csvRows.join('\r\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
}

/**
 * Send XLSX export response
 * Uses xlsx library if available
 */
async function sendXlsxExport(res: ResType, data: Record<string, any>[], modelName: string, fields: Fields, req: ReqType) {
    let XLSX: any;

    try {
        XLSX = await import('xlsx');
    } catch (err) {
        Adminizer.log.error('xlsx library not installed. Install with: npm install xlsx');
        return res.status(500).json({
            error: 'XLSX export requires xlsx library',
            message: 'Please install xlsx: npm install xlsx'
        });
    }

    const filename = `${modelName}_export_${Date.now()}.xlsx`;

    // Get headers (preserve order from fields)
    const headers = Object.keys(fields).map(key => {
        const field = fields[key] as Field;
        const config = field.config;
        return (typeof config === 'object' && config !== null && config.title)
            ? req.i18n.__(config.title)
            : key;
    });

    // Create workbook
    const wb = XLSX.default.utils.book_new();

    // Prepare data array with headers
    const wsData = [headers];

    // Add rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === '' || value === null || value === undefined) {
                return null;
            }
            return value;
        });
        wsData.push(values);
    }

    // Create worksheet
    const ws = XLSX.default.utils.aoa_to_sheet(wsData);

    // Auto-size columns (optional)
    const colWidths = headers.map((header, i) => {
        let maxWidth = header.length;
        for (const row of data) {
            const val = String(row[header] || '');
            if (val.length > maxWidth) {
                maxWidth = val.length;
            }
        }
        // Cap at 50 characters, minimum 10
        return { wch: Math.min(Math.max(maxWidth + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    const sheetName = modelName.substring(0, 31); // Excel sheet name limit
    XLSX.default.utils.book_append_sheet(wb, ws, sheetName);

    // Generate buffer
    const buffer = XLSX.default.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
}

