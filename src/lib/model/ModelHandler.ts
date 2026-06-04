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
 * Lookup is case-insensitive: `"UserAP"`, `"userap"`, and `"USERAP"` all resolve to the same model.
 */
export class ModelHandler {
	private models: Map<string, AbstractModel<any>> = new Map();
	private internalAccess?: InternalModelAccessFactory;
	private appAccessRecords = new Map<string, AppModelAccessRecord>();

	add<T>(modelName: string, modelInstance: AbstractModel<T>): void {


		const modelname = modelName.toLowerCase()
		this.models.set(modelname, modelInstance);
		Adminizer.log.debug(`Model with name [${modelname}] was registered`)
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

	/** Improved model getter, so you can write both model.get("UserAP") and model.get("userap") */
	get model() {

		return {
			get: (modelName: string) => this.models.get(modelName.toLowerCase()),
			has: (modelName: string) => this.models.has(modelName.toLowerCase()),
			entries: () => this.models.entries(),
			keys: () => this.models.keys(),
			values: () => this.models.values(),
		};
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
			return Array.from(this.models.values());
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
}
