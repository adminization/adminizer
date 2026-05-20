import { AbstractModel } from "./AbstractModel";
import { Adminizer } from "../Adminizer";
import { InternalModelAccessMap } from "../../interfaces/internalModelAccess";
import { InternalModelAccessFactory, InternalModelScope } from "./InternalModelAccessFactory";

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

	add<T>(modelName: string, modelInstance: AbstractModel<T>): void {


		const modelname = modelName.toLowerCase()
		this.models.set(modelname, modelInstance);
		Adminizer.log.debug(`Model with name [${modelname}] was registered`)
	}

	// TODO: 'hot reload' need add method for delete model

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
}
