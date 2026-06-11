export interface CatalogTemplateComponentResource {
    id: string;
    type: string;
    component: string;
    exportName?: string;
}

export interface CatalogTemplateComponentRecord extends CatalogTemplateComponentResource {
    id: string;
    appName: string;
    catalog: string;
    enabled: boolean;
}

function normalizeType(type: string): string {
    return type.toLowerCase();
}

function normalizeCatalog(catalog: string): string {
    return catalog.toLowerCase();
}

export class CatalogTemplateComponentHandler {
    private records = new Map<string, CatalogTemplateComponentRecord>();

    register(appName: string, catalog: string, resource: CatalogTemplateComponentResource): string {
        const normalizedCatalog = normalizeCatalog(catalog);
        const id = `${appName}:${normalizedCatalog}:${resource.id}`;
        if (this.records.has(id)) {
            throw new Error(`Catalog template component "${id}" is already registered`);
        }

        const existing = this.getByType(resource.type, normalizedCatalog);
        if (existing) {
            throw new Error(`Catalog template component for type "${resource.type}" is already registered in catalog "${normalizedCatalog}"`);
        }

        this.records.set(id, {
            ...resource,
            id,
            appName,
            type: normalizeType(resource.type),
            catalog: normalizedCatalog,
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
        return this.getAll().filter((record) => record.catalog === normalizedCatalog);
    }

    getByType(type: string, catalog: string): CatalogTemplateComponentRecord | undefined {
        const normalizedType = normalizeType(type);
        const normalizedCatalog = normalizeCatalog(catalog);
        return this.getAll().find((record) =>
            record.type === normalizedType && record.catalog === normalizedCatalog
        );
    }
}
