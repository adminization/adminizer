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
	model: AbstractModel<any>;
	ownerApp?: string;
	enabled: boolean;
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
	private internalAccess?: InternalModelAccessFactory;
	private appAccessRecords = new Map<string, AppModelAccessRecord>();

	add<T>(modelName: string, modelInstance: AbstractModel<T>, aliases: string[] = []): void {


		const modelname = modelName.toLowerCase()
		this.models.set(modelname, {
			id: modelname,
			name: modelName,
			model: modelInstance,
			enabled: true,
		});
		this.registerAliases(modelName, aliases);
		Adminizer.log.debug(`Model with name [${modelname}] was registered`)
	}

	register<T>(appName: string, modelName: string, modelInstance: AbstractModel<T>): string {
		const normalizedModelName = normalizeName(modelName);
		if (this.models.has(normalizedModelName)) {
			throw new Error(`Model "${modelName}" is already registered`);
		}

		this.models.set(normalizedModelName, {
			id: normalizedModelName,
			name: modelName,
			model: modelInstance,
			ownerApp: appName,
			enabled: true,
		});
		Adminizer.log.debug(`Model with name [${normalizedModelName}] was registered by app [${appName}]`)

		return normalizedModelName;
	}

	unregister(id: string): void {
		const record = this.models.get(normalizeName(id));
		if (!record?.ownerApp) {
			return;
		}

		this.models.delete(normalizeName(id));
	}

	disable(id: string): void {
		const record = this.models.get(normalizeName(id));
		if (!record?.ownerApp) {
			return;
		}

		record.enabled = false;
	}

	enable(id: string): void {
		const record = this.models.get(normalizeName(id));
		if (!record?.ownerApp) {
			return;
		}

		record.enabled = true;
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

	/** Improved model getter with case-insensitive lookup and configured alias support. */
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

	resolveModelName(modelName: string): string {
		const resolvedName = this.resolveName(modelName);
		return this.models.get(resolvedName)?.name ?? modelName;
	}

	configureInternalAccess(accessMap?: InternalModelAccessMap): void {
		this.internalAccess = new InternalModelAccessFactory((modelName) => this.model.get(modelName), accessMap);
	}

	internal(scopeName: string): InternalModelScope {
		return this.getInternalAccess().scope(scopeName);
	}

	private getInternalAccess(): InternalModelAccessFactory {
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
