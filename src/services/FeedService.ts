import { Adminizer } from "../lib/Adminizer";
import { FilterAP, FilterCondition } from "../models/FilterAP";
import { DataAccessor } from "../lib/DataAccessor";
import { ModernQueryBuilder, QueryParams } from "../lib/query-builder/ModernQueryBuilder";
import { Field, Fields } from "../helpers/fieldsHelper";
import { FilterService } from "../lib/filters/FilterService";
import { UserAP } from "../models/UserAP";
import { ControllerHelper } from "../helpers/controllerHelper";

/**
 * Feed export format types
 */
export type FeedFormat = 'json' | 'xml';

/**
 * Feed entry metadata
 */
interface FeedEntry {
    id: string | number;
    title: string;
    updated: Date;
    summary?: string;
    content: Record<string, any>;
    link?: string;
}

/**
 * FeedService вЂ” generates public feed exports (Atom XML, JSON) by apiKey
 * No authentication required вЂ” access is granted via apiKey alone
 */
export class FeedService {
    private adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer;
    }

    /**
     * Find filter by apiKey and verify it's enabled
     */
    async findFilterByApiKey(apiKey: string): Promise<FilterAP | null> {
        if (!apiKey) {
            return null;
        }

        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        const filter = await filterModel["_findOne"]({ apiKey, apiEnabled: true, visibility: 'private' });
        return filter as FilterAP | null;
    }

    /**
     * Fetch data for a filter (no auth required вЂ” public API)
     * Bypasses permission checks by building fields directly from model config
     * Also bypasses DataAccessor to avoid user-based filtering
     */
    private async fetchFilterData(filter: FilterAP, adminizer?: Adminizer, user?: UserAP): Promise<{
        records: any[];
        fields: Fields;
        modelName: string;
        entity: any;
    }> {
        const modelName = filter.modelName;
        const adminizerInstance = adminizer || this.adminizer;

        Adminizer.log.info(`FeedService: === START fetchFilterData === filter=${filter.id}, model=${modelName}`);

        // Create a minimal request-like object to use ControllerHelper
        const mockReq = {
            adminizer: adminizerInstance,
            params: { model: modelName, entityType: 'model' },
            query: {},
            originalUrl: `/adminizer/model/${modelName}/list`,
            url: `/adminizer/model/${modelName}/list`
        } as unknown as ReqType;

        // Get entity for model
        const entity = ControllerHelper.findEntityObject(mockReq);
        if (!entity || !entity.model || !entity.model.attributes) {
            throw new Error(`Model '${modelName}' not found`);
        }

        // Build fields directly from model attributes (bypass permission checks for public API)
        const fields = this.buildFieldsFromAttributes(entity.model.attributes, entity.config?.fields || {}, adminizerInstance);
        console.log('[FeedService] fields count=', Object.keys(fields).length);

        // Use saved columns if available
        let displayFields = fields;
        if (filter.columns && filter.columns.length > 0) {
            displayFields = this.applyCustomColumns(fields, filter.columns);
        }
        console.log('[FeedService] displayFields count=', Object.keys(displayFields).length);

        // Convert datetime conditions (same as exportData.ts)
        const rawConditions = filter.conditions || [];
        console.log('[FeedService] raw conditions count=', rawConditions.length);
        const convertedConditions = this.convertDatetimeConditions(rawConditions);
        console.log('[FeedService] converted conditions count=', convertedConditions.length);

        // Build query params for where clause construction
        const queryParams: QueryParams = {
            page: 1,
            limit: 100000,
            filters: convertedConditions.length > 0 ? convertedConditions : undefined,
            sort: filter.sortField || 'id',
            sortDirection: filter.sortDirection || 'ASC',
            fields: Object.keys(displayFields)
        };

        // Build where clause using ModernQueryBuilder
        // Create an administrator DataAccessor to avoid user-based filtering
        const adminUser = user || this.getMinimalSystemUser();
        if (!adminUser.isAdministrator) {
            adminUser.isAdministrator = true; // Bypass sanitizeUserRelationAccess
        }
        const dataAccessor = new DataAccessor(adminizerInstance, adminUser, entity, "list");
        const queryBuilder = new ModernQueryBuilder(
            entity.model,
            fields,
            dataAccessor,
            adminizerInstance.filterCustomFieldHandler
        );

        console.log('[FeedService] calling queryBuilder.execute...');

        const result = await queryBuilder.execute(queryParams);
        console.log('[FeedService] query done, records=', result.data?.length ?? 0, 'total=', result.total, 'filtered=', result.filtered);

        Adminizer.log.info(`FeedService: === END fetchFilterData === records=${result.data?.length ?? 0}`);

        return {
            records: result.data,
            fields: displayFields,
            modelName,
            entity
        };
    }

    /**
     * Build fields object directly from model attributes (bypasses permission checks)
     */
    private buildFieldsFromAttributes(attributes: Record<string, any>, configFields: Record<string, any> = {}, adminizerInstance?: Adminizer): Fields {
        const admin = adminizerInstance || this.adminizer;
        const result: Fields = {};

        for (const [key, modelField] of Object.entries(attributes)) {
            // Skip primary keys for associations
            if (modelField.primaryKeyForAssociation === true) {
                continue;
            }

            // Handle short type notation: fieldName: 'string'
            let normalizedField = typeof modelField === 'string' ? { type: modelField } : modelField;

            // Get field config from model config
            const fieldConfig = configFields[key] || {};

            result[key] = {
                config: fieldConfig,
                populated: undefined,
                model: normalizedField,
                modelConfig: admin.config.models[Object.keys(admin.config.models).find(k => k.toLowerCase() === Object.keys(attributes)[0]?.split('.')[0])?.toLowerCase() || ''] as any || {}
            };
        }

        return result;
    }

    /**
     * Generate JSON feed
     */
    async generateJsonFeed(filter: FilterAP, adminizer?: Adminizer, user?: UserAP): Promise<any> {
        const { records, fields, modelName } = await this.fetchFilterData(filter, adminizer, user);

        const exportData = this.prepareExportData(records, fields);

        return {
            feed: {
                title: filter.name,
                description: filter.description || '',
                modelName,
                generatedAt: new Date().toISOString(),
                totalItems: records.length,
                apiKey: filter.apiKey,
                items: exportData
            }
        };
    }

    /**
     * Generate Atom XML feed
     */
    async generateAtomFeed(filter: FilterAP, adminizer?: Adminizer, user?: UserAP): Promise<string> {
        const { records, fields, modelName } = await this.fetchFilterData(filter, adminizer, user);
        const exportData = this.prepareExportData(records, fields);

        const entries: FeedEntry[] = exportData.map((item, index) => {
            const entryId = item.id || item.ID || index;
            const titleField = this.findTitleField(fields);
            const title = titleField ? String(item[titleField] || `Item ${entryId}`) : `Item ${entryId}`;
            const updated = this.findDateField(fields, item) || new Date();

            return {
                id: String(entryId),
                title,
                updated: new Date(updated),
                summary: title,
                content: item,
                link: `/adminizer/model/${modelName}/view/${entryId}`
            };
        });

        return this.buildAtomXml(filter, modelName, entries, adminizer);
    }

    /**
     * Build Atom XML string
     */
    private buildAtomXml(
        filter: FilterAP,
        modelName: string,
        entries: FeedEntry[],
        adminizerInstance?: Adminizer
    ): string {
        const admin = adminizerInstance || this.adminizer;
        const now = new Date().toISOString();
        const routePrefix = admin.config.routePrefix || '/adminizer';
        const baseUrl = `/${routePrefix.replace(/^\//, '')}`;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<feed xmlns="http://www.w3.org/2005/Atom">\n`;
        xml += `  <id>${baseUrl}/api/feed/${filter.apiKey}</id>\n`;
        xml += `  <title>${this.escapeXml(filter.name)}</title>\n`;
        xml += `  <subtitle>${this.escapeXml(filter.description || `Feed for ${modelName}`)}</subtitle>\n`;
        xml += `  <updated>${now}</updated>\n`;
        xml += `  <link href="${baseUrl}/api/feed/${filter.apiKey}.xml" rel="self" />\n`;
        xml += `  <generator>Adminizer</generator>\n`;

        for (const entry of entries) {
            xml += `  <entry>\n`;
            xml += `    <id>${this.escapeXml(String(entry.id))}</id>\n`;
            xml += `    <title>${this.escapeXml(entry.title)}</title>\n`;
            xml += `    <updated>${entry.updated.toISOString()}</updated>\n`;
            xml += `    <summary>${this.escapeXml(entry.summary || '')}</summary>\n`;

            if (entry.link) {
                xml += `    <link href="${this.escapeXml(entry.link)}" rel="alternate" />\n`;
            }

            // Add content as structured XML
            xml += `    <content type="html">\n`;
            xml += `      <![CDATA[\n`;
            xml += `      <table>\n`;
            for (const [key, value] of Object.entries(entry.content)) {
                const displayValue = value === null || value === undefined ? '' : String(value);
                xml += `        <tr><th>${this.escapeXml(key)}</th><td>${this.escapeXml(displayValue)}</td></tr>\n`;
            }
            xml += `      </table>\n`;
            xml += `      ]]>\n`;
            xml += `    </content>\n`;

            // Also add raw data as JSON in a custom element
            xml += `    <data>${this.escapeXml(JSON.stringify(entry.content))}</data>\n`;
            xml += `  </entry>\n`;
        }

        xml += `</feed>`;

        return xml;
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(str: unknown): string {
        if (str === null || str === undefined) return '';
        const s = String(str);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Prepare data for export вЂ” convert values to human-readable format
     */
    private prepareExportData(records: any[], fields: Fields): Record<string, any>[] {
        return records.map(record => {
            const row: Record<string, any> = {};

            for (const [key, field] of Object.entries(fields)) {
                const fieldConfig = field as Field;
                row[key] = this.formatExportValue(fieldConfig, record[key]);
            }

            return row;
        });
    }

    /**
     * Format value for export based on type
     */
    private formatExportValue(field: Field, value: any): string | number | boolean | null {
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
     * Apply custom column configuration
     */
    private applyCustomColumns(fields: Fields, columns: any[]): Fields {
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
     * Convert datetime filter conditions from HTML5 format to UTC
     * (Same logic as in exportData.ts)
     */
    private convertDatetimeConditions(conditions: FilterCondition[] | undefined): FilterCondition[] {
        if (!conditions || !Array.isArray(conditions)) {
            Adminizer.log.debug('FeedService: conditions is not an array, returning empty');
            return [];
        }
        return conditions
            .filter(cond => {
                if (cond.operator !== 'isNull' && cond.operator !== 'isNotNull' && cond.operator !== 'today') {
                    if (!cond.value && cond.value !== 0 && cond.value !== false) {
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
                        children: this.convertDatetimeConditions(cond.children)
                    };
                }

                if (!cond.field || !cond.value) {
                    return cond;
                }

                if (['isNull', 'isNotNull'].includes(cond.operator)) {
                    return cond;
                }

                const valueStr = String(cond.value ?? '');
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valueStr)) {
                    const parts = valueStr.split('T');
                    if (parts.length !== 2) return cond;
                    const [datePart, timePart] = parts;
                    const dateParts = datePart.split('-');
                    const timeParts = timePart.split(':');
                    if (dateParts.length !== 3 || timeParts.length !== 2) return cond;
                    const [year, month, day] = dateParts.map(Number);
                    const [hours, minutes] = timeParts.map(Number);

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
                    const val1Str = typeof val1 === 'string' ? val1 : '';
                    const val2Str = typeof val2 === 'string' ? val2 : '';
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val1Str) &&
                        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val2Str)) {
                        const p1 = val1Str.split('T');
                        const p2 = val2Str.split('T');
                        if (p1.length === 2 && p2.length === 2) {
                            const [datePart1, timePart1] = p1;
                            const [datePart2, timePart2] = p2;
                            const d1 = datePart1.split('-');
                            const t1 = timePart1.split(':');
                            const d2 = datePart2.split('-');
                            const t2 = timePart2.split(':');
                            if (d1.length === 3 && t1.length === 2 && d2.length === 3 && t2.length === 2) {
                                const [year1, month1, day1] = d1.map(Number);
                                const [hours1, minutes1] = t1.map(Number);
                                const utcDate1 = new Date(Date.UTC(year1, month1 - 1, day1, hours1, minutes1, 0, 0));

                                const [year2, month2, day2] = d2.map(Number);
                                const [hours2, minutes2] = t2.map(Number);
                                const utcDate2 = new Date(Date.UTC(year2, month2 - 1, day2, hours2, minutes2, 0, 0));

                                return {
                                    ...cond,
                                    value: [utcDate1, utcDate2]
                                };
                            }
                        }
                    }
                }

                return cond;
            });
    }

    /**
     * Get minimal system-like user for internal data access
     */
    private getMinimalSystemUser(): UserAP {
        return {
            id: 0,
            login: 'system',
            username: 'system',
            email: 'system@adminizer.local',
            isActive: true,
            role: 'admin',
            isAdministrator: true
        } as unknown as UserAP;
    }

    /**
     * Find title field in fields config
     */
    private findTitleField(fields: Fields): string | null {
        // First look for configured title field
        for (const [key, field] of Object.entries(fields)) {
            const f = field as Field;
            if (f.modelConfig?.titleField) {
                return key;
            }
        }

        // Fallback to common title field names
        const candidates = ['title', 'name', 'label', 'caption'];
        for (const name of candidates) {
            if (fields[name]) {
                return name;
            }
        }

        return null;
    }

    /**
     * Find date field in fields config
     */
    private findDateField(fields: Fields, record: any): Date | null {
        const candidates = ['updatedAt', 'updated_at', 'modifiedAt', 'createdAt', 'created_at'];
        for (const name of candidates) {
            if (record[name]) {
                const date = new Date(record[name]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        return new Date();
    }
}

