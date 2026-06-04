import { AbstractCatalog } from "./AbstractCatalog";

export interface CatalogRecord {
	id: string;
	appName: string;
	catalog: AbstractCatalog;
	enabled: boolean;
}

export class CatalogHandler {
	private catalog: AbstractCatalog[] = [];
	private records = new Map<string, CatalogRecord>();

    public add(catalog: AbstractCatalog) {
		this.catalog.push(catalog)
		return catalog
	}

	public getAll() {
		return [
			...this.catalog,
			...Array.from(this.records.values())
				.filter((record) => record.enabled)
				.map((record) => record.catalog)
		];
	}

	public getCatalog(slug: string) {
		return this.getAll().find((catalog) => catalog.slug === slug)
	}

	public register(appName: string, catalog: AbstractCatalog): string {
		const id = this.getRecordId(appName, catalog);
		if (this.records.has(id)) {
			throw new Error(`Catalog "${id}" is already registered`);
		}

		const existingCatalog = this.getCatalog(catalog.slug);
		if (existingCatalog) {
			throw new Error(`Catalog with slug "${catalog.slug}" is already registered`);
		}

		this.records.set(id, {
			id,
			appName,
			catalog,
			enabled: true,
		});

		return id;
	}

	public unregister(id: string): void {
		this.records.delete(id);
	}

	public disable(id: string): void {
		const record = this.records.get(id);
		if (!record) {
			return;
		}

		record.enabled = false;
	}

	public enable(id: string): void {
		const record = this.records.get(id);
		if (!record) {
			return;
		}

		record.enabled = true;
	}

	public getByApp(appName: string): CatalogRecord[] {
		return Array.from(this.records.values()).filter((record) => record.appName === appName);
	}

	private getRecordId(appName: string, catalog: AbstractCatalog): string {
		return `${appName}:${catalog.slug}`;
	}
}
