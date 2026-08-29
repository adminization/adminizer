import { AbstractModel } from "./AbstractModel";
import { Adminizer } from "../Adminizer";
import { InternalModelAccessMap, InternalModelRepository } from "../../interfaces/internalModelAccess";
import { InternalModelAccessFactory, InternalModelScope } from "./InternalModelAccessFactory";
import { createInternalModelRepository } from "./internalModelRepository";

function normalizeName(name: string): string {
	return name.toLowerCase();
}

export interface AppModelAccessRecord {
	id: string;
	appName: string;
	models: string[];
}

export interface ModelRecord {
	id: string;
	name: string;
	hostModelName: string;
	primaryHostModel: boolean;
	model: AbstractModel<any>;
	ownerApp?: string;
	enabled: boolean;
}

export interface ModelRegistrationOptions {
	/** Physical ORM model name. It is intentionally independent from the Adminizer resource name. */
	hostModelName?: string;
	/**
	 * Selects this resource as the association target when multiple resources use the same host model.
	 * Exactly one resource must be primary for every shared host model.
	 */
	primary?: boolean;
	/**
	 * @deprecated Register and use the canonical Adminizer resource name instead.
	 * Kept only for compatibility with existing integrations. Host model names must not be used as aliases.
	 */
	aliases?: string[];
}

export class AppModelAccess {
	constructor(
		private readonly getModel: (modelName: string) => AbstractModel<any> | undefined,
		private readonly appName: string,
		private readonly allowedModels: () => Set<string>
	) {}

	get<T = any>(modelName: string): InternalModelRepository<T> {
		const normalizedModelName = normalizeName(modelName);
		if (!this.allowedModels().has(normalizedModelName)) {
			throw new Error(`App model access denied: app "${this.appName}" cannot use model "${modelName}"`);
		}

		const model = this.getModel(modelName) as AbstractModel<T> | undefined;
		if (!model) {
			throw new Error(`App model access failed: model "${modelName}" was not found`);
		}

		return createInternalModelRepository<T>(modelName, model);
	}

	has(modelName: string): boolean {
		return this.allowedModels().has(normalizeName(modelName)) && Boolean(this.getModel(modelName));
	}
}

/**
 * Central registry (service locator) for all AbstractModel instances in the application.
 * A single instance is created in Adminizer and shared across the entire app via `req.adminizer.modelHandler`.
 *
 * Models are registered at startup via `bindModels`, then looked up by name from controllers,
 * services, helpers, and system utilities — without importing each model directly.
 *
 * Lookup is case-insensitive and can resolve aliases registered at startup via system model bindings.
 */
export class ModelHandler {
	private models: Map<string, ModelRecord> = new Map();
	private modelAliases: Map<string, string> = new Map();
	private hostModelResources: Map<string, Set<string>> = new Map();
	private internalAccess?: InternalModelAccessFactory;
	private internalAccessEpoch = -1;
	private internalAccessRefresh?: () => void;
	private appAccessRecords = new Map<string, AppModelAccessRecord>();
	private registryEpoch = 0;

	/** Bumped on every registry mutation; consumers key their caches on it. */
	get registryVersion(): number {
		return this.registryEpoch;
	}

	add<T>(resourceName: string, modelInstance: AbstractModel<T>, options?: ModelRegistrationOptions): void;
	/** @deprecated Pass `{ aliases }` in ModelRegistrationOptions, or preferably use the canonical resource name. */
	add<T>(resourceName: string, modelInstance: AbstractModel<T>, aliases?: string[]): void;
	add<T>(
		resourceName: string,
		modelInstance: AbstractModel<T>,
		options: ModelRegistrationOptions | string[] = {}
	): void {
		const resourceId = normalizeName(resourceName);
		if (this.models.has(resourceId)) {
			throw new Error(`Model resource "${resourceName}" is already registered`);
		}

		const normalizedOptions = Array.isArray(options) ? {aliases: options} : options;
		const hostModelName = normalizedOptions.hostModelName ?? resourceName;
		this.registerHostModel(resourceName, hostModelName, true);
		this.models.set(resourceId, {
			id: resourceId,
			name: resourceName,
			hostModelName,
			primaryHostModel: normalizedOptions.primary === true,
			model: modelInstance,
			enabled: true,
		});
		this.registerAliases(resourceName, normalizedOptions.aliases ?? []);
		this.registryEpoch++;
		Adminizer.log.debug(`Model resource [${resourceName}] was registered for host model [${hostModelName}]`)
	}

	register<T>(appName: string, modelName: string, modelInstance: AbstractModel<T>): string {
		const normalizedModelName = normalizeName(modelName);
		if (this.models.has(normalizedModelName)) {
			throw new Error(`Model "${modelName}" is already registered`);
		}

		this.models.set(normalizedModelName, {
			id: normalizedModelName,
			name: modelName,
			hostModelName: modelName,
			primaryHostModel: true,
			model: modelInstance,
			ownerApp: appName,
			enabled: true,
		});
		this.registerHostModel(modelName, modelName, false);
		this.registryEpoch++;
		Adminizer.log.debug(`Model with name [${normalizedModelName}] was registered by app [${appName}]`)

		return normalizedModelName;
	}

	unregister(id: string): void {
		const record = this.models.get(normalizeName(id));
		if (!record?.ownerApp) {
			return;
		}

		this.models.delete(normalizeName(id));
		this.unregisterHostModel(record.hostModelName, record.name);
		this.registryEpoch++;
	}

	disable(id: string): void {
		const record = this.models.get(normalizeName(id));
		if (!record?.ownerApp) {
			return;
		}

		record.enabled = false;
		this.registryEpoch++;
	}

	enable(id: string): void {
		const record = this.models.get(normalizeName(id));
		if (!record?.ownerApp) {
			return;
		}

		record.enabled = true;
		this.registryEpoch++;
	}

	getByApp(appName: string): ModelRecord[] {
		return Array.from(this.models.values()).filter((record) => record.ownerApp === appName);
	}

	registerAppAccess(appName: string, id: string, models: string[]): string {
		const resourceId = `${appName}:${id}`;
		if (this.appAccessRecords.has(resourceId)) {
			throw new Error(`App model access "${resourceId}" is already registered`);
		}

		const missingModels = models.filter((modelName) => !this.model.has(modelName));
		if (missingModels.length) {
			throw new Error(`App "${appName}" requested missing models: ${missingModels.join(", ")}`);
		}

		this.appAccessRecords.set(resourceId, {
			id: resourceId,
			appName,
			models: Array.from(new Set(models.map(normalizeName))),
		});

		return resourceId;
	}

	unregisterAppAccess(id: string): void {
		this.appAccessRecords.delete(id);
	}

	getAppAccessRecords(appName: string): AppModelAccessRecord[] {
		return Array.from(this.appAccessRecords.values()).filter((record) => record.appName === appName);
	}

	createAppAccess(appName: string): AppModelAccess {
		return new AppModelAccess(
			(modelName) => this.model.get(modelName),
			appName,
			() => this.getAllowedAppModels(appName)
		);
	}

	// TODO: 'hot reload' need add method for delete model & unbind

	/**
	 * Improved model getter with case-insensitive lookup and configured alias support.
	 * @deprecated New code should use getResource() and getByHostModel() explicitly.
	 */
	get model() {

		return {
			get: (modelName: string) => this.models.get(this.resolveName(modelName))?.enabled
				? this.models.get(this.resolveName(modelName)).model
				: undefined,
			has: (modelName: string) => Boolean(this.models.get(this.resolveName(modelName))?.enabled),
			entries: () => this.enabledModelEntries(),
			keys: () => this.enabledModelKeys(),
			values: () => this.enabledModelValues(),
		};
	}

	/**
	 * Returns a model by its Adminizer resource name or an explicit deprecated compatibility alias.
	 * New code must use canonical resource names.
	 */
	getResource(resourceName: string): AbstractModel<any> | undefined {
		return this.model.get(resourceName);
	}

	getResourceRecord(resourceName: string): ModelRecord | undefined {
		const record = this.models.get(this.resolveName(resourceName));
		return record?.enabled ? record : undefined;
	}

	/**
	 * Resolves a physical ORM model name to its Adminizer resource.
	 * This lookup is deliberately separate from getResource(): a host model may have the
	 * same name as a system resource while being exposed under a project resource alias.
	 */
	resolveResourceByHostModel(hostModelName: string): string | undefined {
		const resourceIds = this.hostModelResources.get(normalizeName(hostModelName));
		const records = Array.from(resourceIds ?? [])
			.map((resourceId) => this.models.get(resourceId))
			.filter((record): record is ModelRecord => Boolean(record?.enabled));

		if (records.length === 1) {
			return records[0].name;
		}

		const primaryRecords = records.filter((record) => record.primaryHostModel);
		if (primaryRecords.length === 1) {
			return primaryRecords[0].name;
		}

		if (records.length > 1) {
			throw new Error(this.getSharedHostModelError(hostModelName, records));
		}

		return undefined;
	}

	getByHostModel(hostModelName: string): AbstractModel<any> | undefined {
		const resourceName = this.resolveResourceByHostModel(hostModelName);
		return resourceName ? this.getResource(resourceName) : undefined;
	}

	/**
	 * Resolves an ORM association target. Adapter-provided host model names take precedence;
	 * system-model relations may pass their explicit canonical resource name instead.
	 */
	resolveAssociationResource(targetName: string, resourceName?: string): string | undefined {
		if (resourceName) {
			return this.getResourceRecord(resourceName)?.name;
		}

		return this.resolveResourceByHostModel(targetName)
			?? this.getResourceRecord(targetName)?.name;
	}

	/** Validates that every host ORM model used by multiple resources has one primary resource. */
	validateHostModelMappings(): void {
		for (const [normalizedHostModelName, resourceIds] of this.hostModelResources) {
			const records = Array.from(resourceIds)
				.map((resourceId) => this.models.get(resourceId))
				.filter((record): record is ModelRecord => Boolean(record?.enabled));
			if (records.length > 1 && records.filter((record) => record.primaryHostModel).length !== 1) {
				throw new Error(this.getSharedHostModelError(records[0]?.hostModelName ?? normalizedHostModelName, records));
			}
		}
	}

	resolveModelName(modelName: string): string {
		const resolvedName = this.resolveName(modelName);
		return this.models.get(resolvedName)?.name ?? modelName;
	}

	configureInternalAccess(accessMap?: InternalModelAccessMap): void {
		this.internalAccess = new InternalModelAccessFactory((modelName) => this.model.get(modelName), accessMap);
		this.internalAccessEpoch = this.registryEpoch;
	}

	/**
	 * Installs the rebuild of the internal allowlists (Adminizer wires it to
	 * `refreshInternalModelAccess`). The allowlists mirror the registry, so every registry
	 * mutation — a host `add` after init, an app `register`/`unregister`, `enable`/`disable` —
	 * has to be reflected there, not only the ones that emit `app:model:*`. Mutations merely
	 * mark the map stale and the rebuild runs on the next internal access, so a boot that
	 * registers dozens of models pays for one rebuild instead of one per model.
	 */
	setInternalAccessRefresher(refresh: () => void): void {
		this.internalAccessRefresh = refresh;
	}

	internal(scopeName: string): InternalModelScope {
		return this.getInternalAccess().scope(scopeName);
	}

	private getInternalAccess(): InternalModelAccessFactory {
		// Only `configureInternalAccess` stamps the epoch, so a refresher that cannot build a
		// map yet (no config) leaves the allowlists stale instead of marking them fresh.
		if (this.internalAccessRefresh && this.internalAccessEpoch !== this.registryEpoch) {
			this.internalAccessRefresh();
		}

		if (!this.internalAccess) {
			throw new Error("Internal model access is not configured");
		}

		return this.internalAccess;
	}

	/**
	 * Get all models
	 */
	get all() {
		try {
			return Array.from(this.enabledModelValues());
		} catch (e) {
			Adminizer.log.error(e);
			return [];
		}
	}

	private getAllowedAppModels(appName: string): Set<string> {
		const allowedModels = new Set<string>();
		for (const record of this.getAppAccessRecords(appName)) {
			for (const modelName of record.models) {
				allowedModels.add(modelName);
			}
		}
		return allowedModels;
	}

	private registerAliases(modelName: string, aliases: string[]): void {
		const normalizedModelName = normalizeName(modelName);
		for (const alias of aliases) {
			const normalizedAlias = normalizeName(alias);
			if (normalizedAlias === normalizedModelName) {
				continue;
			}

			const existingTarget = this.modelAliases.get(normalizedAlias);
			if (existingTarget && existingTarget !== normalizedModelName) {
				throw new Error(`Model alias "${alias}" is already registered for model "${existingTarget}"`);
			}

			if (this.models.has(normalizedAlias) && normalizedAlias !== normalizedModelName) {
				throw new Error(`Model alias "${alias}" conflicts with a registered model`);
			}

			this.modelAliases.set(normalizedAlias, normalizedModelName);
		}
	}

	private registerHostModel(resourceName: string, hostModelName: string, allowMultipleResources: boolean): void {
		const normalizedHostModelName = normalizeName(hostModelName);
		const resourceId = normalizeName(resourceName);
		const resourceIds = this.hostModelResources.get(normalizedHostModelName) ?? new Set<string>();
		if (!allowMultipleResources && resourceIds.size && !resourceIds.has(resourceId)) {
			const existingResourceId = resourceIds.values().next().value as string;
			const existingResource = this.models.get(existingResourceId)?.name ?? existingResourceId;
			throw new Error(
				`Host model "${hostModelName}" is already registered for Adminizer resource "${existingResource}"`
			);
		}

		resourceIds.add(resourceId);
		this.hostModelResources.set(normalizedHostModelName, resourceIds);
	}

	private unregisterHostModel(hostModelName: string, resourceName: string): void {
		const normalizedHostModelName = normalizeName(hostModelName);
		const resourceIds = this.hostModelResources.get(normalizedHostModelName);
		resourceIds?.delete(normalizeName(resourceName));
		if (!resourceIds?.size) {
			this.hostModelResources.delete(normalizedHostModelName);
		}
	}

	private getSharedHostModelError(hostModelName: string, records: ModelRecord[]): string {
		return (
			`Host model "${hostModelName}" is mapped to multiple Adminizer resources: ` +
			`${records.map((record) => record.name).join(", ")}. Configure exactly one with primary: true.`
		);
	}

	private resolveName(modelName: string): string {
		const normalizedModelName = normalizeName(modelName);
		return this.modelAliases.get(normalizedModelName) ?? normalizedModelName;
	}

	private *enabledModelEntries(): IterableIterator<[string, AbstractModel<any>]> {
		for (const [modelName, record] of this.models.entries()) {
			if (record.enabled) {
				yield [modelName, record.model];
			}
		}
	}

	private *enabledModelKeys(): IterableIterator<string> {
		for (const [modelName, record] of this.models.entries()) {
			if (record.enabled) {
				yield modelName;
			}
		}
	}

	private *enabledModelValues(): IterableIterator<AbstractModel<any>> {
		for (const record of this.models.values()) {
			if (record.enabled) {
				yield record.model;
			}
		}
	}
}
