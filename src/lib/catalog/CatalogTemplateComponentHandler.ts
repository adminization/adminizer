export interface CatalogTemplateComponentResource {
    id: string;
    catalog?: string | string[];
    type: string;
    component: string;
    exportName?: string;
}

export interface CatalogTemplateComponentRecord extends CatalogTemplateComponentResource {
    id: string;
    appName: string;
    catalogs: string[];
    enabled: boolean;
}

function normalizeType(type: string): string {
    return type.toLowerCase();
}

function normalizeCatalog(catalog: string): string {
    return catalog.toLowerCase();
}

function normalizeCatalogs(catalog?: string | string[]): string[] {
    if (!catalog) {
        return [];
    }

    return (Array.isArray(catalog) ? catalog : [catalog]).map(normalizeCatalog);
}

export class CatalogTemplateComponentHandler {
    private records = new Map<string, CatalogTemplateComponentRecord>();

    register(appName: string, resource: CatalogTemplateComponentResource): string {
        const id = `${appName}:${resource.id}`;
        if (this.records.has(id)) {
            throw new Error(`Catalog template component "${id}" is already registered`);
        }

        const catalogs = normalizeCatalogs(resource.catalog);
        const existing = this.getByType(resource.type, catalogs);
        if (existing) {
            throw new Error(`Catalog template component for type "${resource.type}" is already registered in the same catalog scope`);
        }

        this.records.set(id, {
            ...resource,
            id,
            appName,
            type: normalizeType(resource.type),
            catalogs,
            enabled: true,
        });

        return id;
    }

    unregister(id: string): void {
        this.records.delete(id);
    }

    disable(id: string): void {
        const record = this.records.get(id);
        if (record) {
            record.enabled = false;
        }
    }

    enable(id: string): void {
        const record = this.records.get(id);
        if (record) {
            record.enabled = true;
        }
    }

    getAll(): CatalogTemplateComponentRecord[] {
        return Array.from(this.records.values()).filter((record) => record.enabled);
    }

    getByApp(appName: string): CatalogTemplateComponentRecord[] {
        return Array.from(this.records.values()).filter((record) => record.appName === appName);
    }

    getByCatalog(catalog: string): CatalogTemplateComponentRecord[] {
        const normalizedCatalog = normalizeCatalog(catalog);
        return this.getAll().filter((record) =>
            record.catalogs.length === 0 || record.catalogs.includes(normalizedCatalog)
        );
    }

    getByType(type: string, catalogs?: string[]): CatalogTemplateComponentRecord | undefined {
        const normalizedType = normalizeType(type);
        const normalizedCatalogs = catalogs?.map(normalizeCatalog) ?? [];
        return this.getAll().find((record) =>
            record.type === normalizedType && this.hasScopeConflict(record.catalogs, normalizedCatalogs)
        );
    }

    private hasScopeConflict(a: string[], b: string[]): boolean {
        if (a.length === 0 || b.length === 0) {
            return true;
        }

        return a.some((catalog) => b.includes(catalog));
    }
}
