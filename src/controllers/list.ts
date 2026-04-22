import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {ModernQueryBuilder, QueryParams, QueryResult} from "../lib/query-builder/ModernQueryBuilder";
import {Adminizer} from "../lib/Adminizer";
import {inertiaListHelper} from "../helpers/inertiaListHelper";
import {Field, Fields} from "../helpers/fieldsHelper";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";
import {FilterCondition, FilterAP, FilterOperator} from "../models/FilterAP";
import {FilterColumnAP} from "../models/FilterColumnAP";
import {FilterService} from "../lib/filters/FilterService";

/**
 * Convert datetime filter conditions from HTML5 format to UTC
 * HTML5 datetime-local returns "2026-03-17T23:41" WITHOUT timezone
 * Parse as UTC to match DB storage
 * Also filters out conditions with undefined/null/empty values
 */
function convertDatetimeConditions(conditions: FilterCondition[]): FilterCondition[] {
    return conditions
        .filter(cond => {
            // Filter out conditions with undefined/null/empty values (except isNull/isNotNull)
            // IMPORTANT: boolean false is a valid value and should NOT be filtered out
            if (cond.operator !== 'isNull' && cond.operator !== 'isNotNull' && cond.operator !== 'today') {
                if (cond.value === undefined || cond.value === null || cond.value === '') {
                    return false;
                }
                // For arrays, check if all values are valid
                if (Array.isArray(cond.value) && cond.value.length === 0) {
                    return false;
                }
            }
            return true;
        })
        .map(cond => {
        // Handle nested conditions recursively
        if (cond.children && cond.children.length > 0) {
            return {
                ...cond,
                children: convertDatetimeConditions(cond.children)
            };
        }

        // Skip non-datetime conditions
        // IMPORTANT: boolean false is valid, so check for undefined/null only
        if (!cond.field || cond.value === undefined || cond.value === null || cond.value === '') {
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

export default async function list(req: ReqType, res: ResType) {
    let entity = ControllerHelper.findEntityObject(req);
    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    let dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    let fields = dataAccessor.getFieldsConfig();
    const header = inertiaListHelper(entity, req, fields);

    // Parse pagination
    const page = req.query.page ? parseInt(req.query.page.toString(), 10) : 1;
    const limit = req.query.count ? parseInt(req.query.count.toString(), 10) : 5;

    // Parse sorting
    const orderColumn = req.query.column ? req.query.column.toString() : undefined;
    const direction = req.query.direction === "asc" ? 'ASC' : 'DESC';

    // Parse global search
    const globalSearch = req.query.globalSearch ? req.query.globalSearch.toString() : "";

    // Check for saved filter (filterId parameter)
    const filterId = req.query.filterId ? req.query.filterId.toString() : undefined;
    let savedFilter: FilterAP | null = null;
    let savedColumns: FilterColumnAP[] = [];
    let filterError: string | null = null;

    if (filterId) {
        try {
            // Handle temporary filter from session (keyed by model name)
            if (filterId === 'temporary' && req.session?.temporaryFilters?.[entity.name]) {
                const tempFilter = req.session.temporaryFilters[entity.name];
                savedFilter = {
                    id: 'temporary',
                    name: tempFilter.name,
                    conditions: tempFilter.conditions,
                    modelName: entity.name,
                    visibility: 'private',
                    ownerId: req.user?.id || null,
                    apiEnabled: false,
                    version: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as unknown as FilterAP;

                // Use temporary filter columns if available
                if (tempFilter.columns && Array.isArray(tempFilter.columns)) {
                    savedColumns = tempFilter.columns.map((col: any, index: number) => ({
                        id: index + 1,
                        filter: 'temporary',
                        fieldName: col.fieldName,
                        order: col.order !== undefined ? col.order : index
                    } as FilterColumnAP));
                } else {
                    savedColumns = [];
                }
            } else if (filterId !== 'temporary') {
                // Load saved filter from database
                const filterService = new FilterService(req.adminizer);
                const result = await filterService.getFilterWithColumns(filterId, req.user);
                savedFilter = result.filter;
                savedColumns = result.columns;

                if (!savedFilter) {
                    filterError = 'Filter not found or access denied';
                }
            } else {
                filterError = 'Temporary filter not found in session';
            }
        } catch (err) {
            Adminizer.log.error('Error loading filter:', err);
            filterError = 'Error loading filter';
        }
    }

    // Update header with active filter name
    if (savedFilter && savedFilter.name) {
        (header as any).activeFilterName = savedFilter.name;
    }

    // Parse column-specific search
    const searchColumns = req.query.searchColumn
        ? Array.isArray(req.query.searchColumn)
            ? req.query.searchColumn.map(String).filter(c => c && c.trim() !== '')
            : [String(req.query.searchColumn)].filter(c => c && c.trim() !== '')
        : [];

    const searchColumnValues = req.query.searchColumnValue
        ? Array.isArray(req.query.searchColumnValue)
            ? req.query.searchColumnValue.map(v => v ? String(v) : "")
            : [String(req.query.searchColumnValue)]
        : [];

    // Collect {column, value} pairs, removing duplicate columns
    const searchMap = new Map<string, string>();
    for (let i = 0; i < searchColumns.length; i++) {
        const column = searchColumns[i];
        const value = searchColumnValues[i] || "";
        // Only add non-empty values
        if (value && value.trim() !== '') {
            searchMap.set(column, value);
        }
    }

    const searchPairs = Array.from(searchMap.entries()).map(([column, value]) => ({
        column,
        value,
    }));

    // Build filter conditions
    let filters: FilterCondition[] = [];

    // If saved filter, use its conditions (with datetime conversion)
    if (savedFilter && savedFilter.conditions) {
        filters = convertDatetimeConditions(savedFilter.conditions);
    }

    // Apply custom columns if filter has them
    let displayFields = fields;
    let customColumnsConfig: FilterColumnAP[] | null = null;

    if (savedColumns.length > 0) {
        customColumnsConfig = savedColumns;
        // Filter and reorder fields based on custom column configuration
        displayFields = applyCustomColumns(fields, savedColumns);
    }

    // Add column search conditions (with datetime conversion)
    const searchFilters = buildFiltersFromSearchPairs(displayFields, searchPairs);
    if (searchFilters && searchFilters.length > 0) {
        filters = [...filters, ...convertDatetimeConditions(searchFilters)];
    }

    // Prepare columns for frontend
    const columns = setColumns(displayFields, orderColumn, direction.toLowerCase() as 'asc' | 'desc', searchPairs, req);

    // Convert column index to field name based on display fields
    const sortField = orderColumn ? getFieldNameByIndex(displayFields, parseInt(orderColumn, 10)) : undefined;

    // Determine sort field - prefer URL param, then filter setting
    let effectiveSortField = sortField;
    let effectiveSortDirection: 'ASC' | 'DESC' = direction;

    if (!effectiveSortField && savedFilter?.sortField) {
        effectiveSortField = savedFilter.sortField;
        effectiveSortDirection = savedFilter.sortDirection || 'DESC';
    }

    // Build query parameters
    const queryParams: QueryParams = {
        page,
        limit,
        sort: effectiveSortField,
        sortDirection: effectiveSortDirection,
        filters: filters && filters.length > 0 ? filters : undefined,
        globalSearch: globalSearch || undefined
    };

    // Execute query using ModernQueryBuilder (use original fields for query, displayFields for output)
    const queryBuilder = new ModernQueryBuilder(
        entity.model,
        fields,
        dataAccessor,
        req.adminizer.filterCustomFieldHandler
    );

    try {
        const result = await queryBuilder.execute(queryParams);

        // Build active filter info for frontend
        const activeFilter = savedFilter ? {
            id: savedFilter.id,
            name: savedFilter.name,
            description: savedFilter.description,
            icon: savedFilter.icon,
            color: savedFilter.color,
            conditions: savedFilter.conditions
        } : null;

        // Build field name mapping for display
        const fieldNames: Record<string, string> = {};
        Object.entries(fields).forEach(([key, field]: [string, any]) => {
            if (field && typeof field === 'object') {
                fieldNames[key] = field.title || key;
            }
        });

        // Format conditions with field names for display
        const formattedConditions = savedFilter?.conditions?.map((cond: any) => {
            if (cond.field) {
                return {
                    ...cond,
                    fieldName: fieldNames[cond.field] || cond.field
                };
            }

            if (cond.customHandler) {
                const customHandlerName = cond.customHandlerName
                    || req.adminizer.filterCustomFieldHandler?.get(cond.customHandler)?.name;
                const fallbackField = typeof cond.customHandler === 'string'
                    ? cond.customHandler.split('.').pop()
                    : '';
                const resolvedField = fallbackField && fieldNames[fallbackField]
                    ? fieldNames[fallbackField]
                    : (fallbackField || cond.customHandler);

                return {
                    ...cond,
                    fieldName: resolvedField,
                    customHandlerName
                };
            }

            if (cond.relation && cond.relationField) {
                const relationField = fields[cond.relation as keyof typeof fields] as any;
                const relationLabel = relationField?.config?.title || cond.relation;
                const nestedLabel = relationField?.populated?.[cond.relationField]?.config?.title || cond.relationField;
                return {
                    ...cond,
                    fieldName: `${relationLabel}.${nestedLabel}`
                };
            }

            return {
                ...cond,
                fieldName: ''
            };
        }) || [];

        // Update header with active filter name
        if (savedFilter && savedFilter.name) {
            (header as any).activeFilterName = savedFilter.name;
            (header as any).activeFilterConditions = formattedConditions;
        }

        return req.Inertia.render({
            component: 'list',
            props: {
                header: header,
                columns: columns,
                data: {
                    data: result.data,
                    recordsTotal: result.total,
                    recordsFiltered: result.filtered,
                    page: result.page,
                    pages: result.pages
                },
                activeFilter: activeFilter,
                filterError: filterError,
                customColumns: customColumnsConfig
            }
        });
    } catch (err) {
        Adminizer.log.error(err);
        return req.Inertia.render({
            component: 'list',
            props: {
                header: header,
                columns: columns,
                data: {
                    data: [],
                    recordsTotal: 0,
                    recordsFiltered: 0,
                    page: 1,
                    pages: 0
                },
                activeFilter: null,
                filterError: filterError || 'Query execution error',
                customColumns: null
            }
        });
    }
}

/**
 * Apply custom column configuration to fields
 * Returns fields filtered and ordered according to saved column config
 */
function applyCustomColumns(fields: Fields, columns: FilterColumnAP[]): Fields {
    // Sort columns by order
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Only include visible columns that exist in fields
    const visibleColumns = sortedColumns.filter(col => fields[col.fieldName]);

    // If no visible columns configured, return original fields
    if (visibleColumns.length === 0) {
        return fields;
    }

    // Build new fields object with custom order
    const result: Fields = {};

    for (const col of visibleColumns) {
        const field = fields[col.fieldName];
        if (field) {
            result[col.fieldName] = field;
        }
    }

    return result;
}

/**
 * Get field name by column index
 */
function getFieldNameByIndex(fields: Fields, index: number): string | undefined {
    const fieldNames = Object.keys(fields);
    // Index 0 is usually actions column, so actual fields start from index 1
    const fieldIndex = index - 1;
    return fieldIndex >= 0 && fieldIndex < fieldNames.length ? fieldNames[fieldIndex] : undefined;
}

/**
 * Build FilterCondition[] from search pairs
 * Supports:
 * - String: contains search
 * - Number: exact match, > (greater than), < (less than)
 * - Boolean: true/false, 1/0, yes/no
 * - Date: exact match
 */
function buildFiltersFromSearchPairs(
    fields: Fields,
    searchPairs: Array<{ column: string; value: string }>
): FilterCondition[] {
    const filters: FilterCondition[] = [];
    const fieldNames = Object.keys(fields);

    for (const pair of searchPairs) {
        // Skip empty values or LIKE patterns (starts and ends with %)
        if (!pair.value || pair.value.trim() === '' ||
            (pair.value.startsWith('%') && pair.value.endsWith('%'))) {
            continue;
        }

        const fieldIndex = parseInt(pair.column, 10) - 1; // Column index starts from 1
        if (fieldIndex < 0 || fieldIndex >= fieldNames.length) {
            continue;
        }

        const fieldName = fieldNames[fieldIndex];
        const field = fields[fieldName];
        const fieldType = field.model?.type as string | undefined;

        // Determine operator based on field type
        let operator: FilterCondition['operator'] = 'like';
        let value: any = pair.value;

        if (fieldType === 'number' || (fieldType as any) === 'integer' || (fieldType as any) === 'float') {
            // Support >, <, >=, <= operators for numbers
            const searchStr = pair.value.trim();
            if (searchStr.startsWith('>=')) {
                const numValue = parseFloat(searchStr.substring(2));
                if (!isNaN(numValue)) {
                    operator = 'gte';
                    value = numValue;
                } else {
                    continue;
                }
            } else if (searchStr.startsWith('>')) {
                const numValue = parseFloat(searchStr.substring(1));
                if (!isNaN(numValue)) {
                    operator = 'gt';
                    value = numValue;
                } else {
                    continue;
                }
            } else if (searchStr.startsWith('<=')) {
                const numValue = parseFloat(searchStr.substring(2));
                if (!isNaN(numValue)) {
                    operator = 'lte';
                    value = numValue;
                } else {
                    continue;
                }
            } else if (searchStr.startsWith('<')) {
                const numValue = parseFloat(searchStr.substring(1));
                if (!isNaN(numValue)) {
                    operator = 'lt';
                    value = numValue;
                } else {
                    continue;
                }
            } else {
                // Exact match for numbers
                const numValue = parseFloat(pair.value);
                if (!isNaN(numValue)) {
                    operator = 'eq';
                    value = numValue;
                } else {
                    continue; // Skip invalid number
                }
            }
        } else if (fieldType === 'boolean') {
            const lowerValue = pair.value.toLowerCase();
            if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
                value = true;
            } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
                value = false;
            } else {
                continue; // Skip invalid boolean
            }
            operator = 'eq';
        } else if ((fieldType as any) === 'date') {
            // For date fields, parse and use exact match
            const parsedDate = new Date(pair.value);
            if (isNaN(parsedDate.getTime())) {
                continue; // Skip invalid date
            }
            operator = 'eq';
            value = parsedDate;
        } else if ((fieldType as any) === 'time') {
            // Time fields can be searched with LIKE (stored as HH:MM)
            operator = 'like';
            value = pair.value;
        }

        filters.push({
            id: `search-${fieldName}-${Date.now()}-${Math.random()}`,
            field: fieldName,
            operator,
            value
        });
    }

    return filters;
}

/**
 * Set columns configuration for frontend
 */
function setColumns(
    fields: Fields,
    orderColumn: string | undefined,
    direction: 'asc' | 'desc',
    searchPairs: Array<{ column: string; value: string }>,
    req: ReqType
): Record<string, object> {
    const columns: Record<string, object> = {};
    let i = 1;

    for (const key of Object.keys(fields)) {
        const field = fields[key] as Field;

        // Check if this field has search value
        const searchForThisColumn = searchPairs.find(pair => pair.column === String(i));
        const searchValue = searchForThisColumn ? searchForThisColumn.value : "";

        columns[key] = {
            ...field.config as BaseFieldConfig,
            hasDisplayModifier: !!(field.config as BaseFieldConfig).displayModifier,
            title: req.i18n.__((field.config as BaseFieldConfig).title),
            data: String(i),
            direction: String(i) === orderColumn ? direction : undefined,
            searchColumnValue: searchValue || undefined
        };

        i++;
    }

    return columns;
}

