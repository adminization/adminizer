import { Adminizer } from "../lib/Adminizer";
import { Filter } from "../models/Filter";
import { DataAccessor } from "../lib/DataAccessor";
import { ListQueryBuilder } from "../lib/list-query-builder/ListQueryBuilder";
import { ListQueryBuilderParams } from "../interfaces/listQueryBuilder";
import { Field, Fields } from "../helpers/fieldsHelper";
import { FilterService } from "../lib/filters/FilterService";
import { User } from "../models/User";
import { ControllerHelper } from "../helpers/controllerHelper";
import { convertDatetimeConditions } from "../helpers/filterDatetimeHelper";

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
    async findFilterByApiKey(apiKey: string): Promise<Filter | null> {
        if (!apiKey) {
            return null;
        }

        return await this.adminizer.modelHandler
            .internal("feed")
            .get<Filter>("Filter")
            .findOne({where: {apiKey, apiEnabled: true, visibility: 'private'}});
    }

    /**
     * Fetch data for a filter (no auth required вЂ” public API)
     * Bypasses permission checks by building fields directly from model config
     * Also bypasses DataAccessor to avoid user-based filtering
     */
    private async fetchFilterData(filter: Filter, adminizer?: Adminizer, user?: User): Promise<{
        records: any[];
        fields: Fields;
        modelName: string;
        modelResource: any;
    }> {
        const modelName = filter.modelName;
        const adminizerInstance = adminizer || this.adminizer;

        if(!user) throw 'User is not defined';

        Adminizer.log.info(`FeedService: === START fetchFilterData === filter=${filter.id}, model=${modelName}`);

        // Create a minimal request-like object to use ControllerHelper
        const mockReq = {
            adminizer: adminizerInstance,
            params: { modelResourceName: modelName },
            query: {},
            originalUrl: `/adminizer/model/${modelName}/list`,
            url: `/adminizer/model/${modelName}/list`
        } as unknown as ReqType;

        // Get ModelResource for model
        const modelResource = ControllerHelper.findModelResource(mockReq);
        if (!modelResource || !modelResource.model || !modelResource.model.attributes) {
            throw new Error(`Model '${modelName}' not found`);
        }

        // Build fields directly from model attributes (bypass permission checks for public API)
        const fields = this.buildFieldsFromAttributes(modelResource.model.attributes, modelResource.config?.fields || {}, adminizerInstance);

        // Use saved columns if available
        let displayFields = fields;
        if (filter.columns && filter.columns.length > 0) {
            displayFields = this.applyCustomColumns(fields, filter.columns);
        }

        // Convert datetime conditions (same as exportData.ts)
        const rawConditions = filter.conditions || [];
        const convertedConditions = convertDatetimeConditions(rawConditions, { dropEmptyValues: true });

        const createdAtSortField = this.resolveCreatedAtSortField(modelResource.model.attributes, displayFields);

        // Build query params for where clause construction
        const queryParams: ListQueryBuilderParams = {
            page: 1,
            limit: 20,
            filters: convertedConditions.length > 0 ? convertedConditions : undefined,
            sort: createdAtSortField,
            sortDirection: 'DESC',
            fields: Object.keys(displayFields)
        };

        // Build where clause using ListQueryBuilder
        // Create an administrator DataAccessor to avoid user-based filtering
        

        const dataAccessor = new DataAccessor(adminizerInstance, user, modelResource, "list");
        const listQueryBuilder = new ListQueryBuilder(
            modelResource.model,
            fields,
            dataAccessor,
            adminizerInstance.customFilterHandler
        );


        const result = await listQueryBuilder.execute(queryParams);

        Adminizer.log.info(`FeedService: === END fetchFilterData === records=${result.data?.length ?? 0}`);

        return {
            records: result.data,
            fields: displayFields,
            modelName,
            modelResource
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
    async generateJsonFeed(filter: Filter, adminizer?: Adminizer, user?: User): Promise<any> {
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
    async generateAtomFeed(filter: Filter, adminizer?: Adminizer, user?: User): Promise<string> {
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
        filter: Filter,
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
     * Resolve the best field for "newest first" sorting.
     * Priority: createdAt -> created_at -> id
     */
    private resolveCreatedAtSortField(attributes: Record<string, any>, fields: Fields): string {
        const candidates = ['createdAt', 'created_at'];

        for (const candidate of candidates) {
            if (attributes?.[candidate] || fields?.[candidate]) {
                return candidate;
            }
        }

        return 'id';
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



