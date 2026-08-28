import { AdminpanelConfig, BaseFieldConfig, ModelConfig } from "../interfaces/adminpanelConfig";
import { Attribute } from "../lib/model/AbstractModel";
import { Adminizer } from "../lib/Adminizer";
import { getDefaultConfig } from "../system/defaults";

export class ConfigHelper {

	public adminizer: Adminizer;

	constructor(adminizer: Adminizer) {
		this.adminizer = adminizer;
	}

	public getConfig(): AdminpanelConfig {
		return this.adminizer.config;
	}

	/**
	 * Checks if given field is identifier of model
	 *
	 * @param {Object} field
	 * @param {Object|string=} modelOrName
	 * @returns {boolean}
	 */
	public isId(field: { config: { key: string; }; }, modelOrName: string): boolean {
		return (field.config.key == this.getIdentifierField(modelOrName));
	}

	/**
	 * Get configured `identifierField` from adminpanel configuration.
	 *
	 * If not configured and model passed try to guess it using `primaryKey` field in model.
	 * If system couldn't guess will return 'id'.
	 * Model could be object or just name (string).
	 *
	 * **Warning** If you will pass record - method will return 'id'
	 *
	 * @returns {string}
	 * @param modelName
	 */
	public getIdentifierField(modelName: string): string {
		if (!modelName) {
			throw new Error("Model name is not defined")
		}

		const resourceName = this.adminizer.modelHandler.getResourceRecord(modelName)?.name
			?? this.adminizer.modelHandler.resolveResourceByHostModel(modelName);
		const modelConfig = resourceName && typeof this.adminizer.config.models[resourceName] !== "boolean"
			? this.adminizer.config.models[resourceName] as ModelConfig
			: undefined;
		const model = resourceName ? this.adminizer.modelHandler.getResource(resourceName) : undefined;

		if (modelConfig && modelConfig.identifierField) {
			return modelConfig.identifierField;
		} else if (model?.primaryKey) {
			return model.primaryKey
		} else {
			throw new Error("ConfigHelper > Identifier field was not found")
		}
	}

	/**
	 * Checks if CSRF protection enabled in website
	 *
	 * @returns {boolean}
	 */
	public isCsrfEnabled() {
		return (this.adminizer.config.security.csrf !== false);
	}

	/**
	 * Normalizes field configuration: fills in default title/visibility and
	 * resolves identifier/display fields for association types.
	 *
	 * @param adminizer
	 * @param config Field configuration object
	 * @param key Field key name
	 * @param modelField Field model configuration
	 * @returns Normalized field configuration
	 */
	public normalizeFieldConfig(
		adminizer: Adminizer,
		config: BaseFieldConfig,
		key: string,
		modelField: Attribute
	): BaseFieldConfig | undefined {
		if (typeof config !== "object" || config === null) {
			Adminizer.log.warn(
				`Field "${key}" config is a primitive (${typeof config}) and will be ignored. ` +
				`Since v5 field configs must be objects (ModelFieldConfig); the boolean/string shorthand has been removed.`
			);
			return undefined;
		}

		config.title = config.title || key;
		config.visible = config.visible === undefined ? true : Boolean(config.visible);

		if (["association", "association-many"].includes(config.type)) {
			let associatedModelAttributes = {};
			let displayField: string;

			try {
				const associatedModelName =
					config.type === "association"
						? modelField.model
						: modelField.collection;

				if (!associatedModelName) {
					throw new Error(`No model/collection defined for association field: ${key}`);
				}

				const resourceName = adminizer.modelHandler.resolveAssociationResource(
					associatedModelName,
					modelField.resourceName
				);
				const associatedModel = resourceName ? adminizer.modelHandler.getResource(resourceName) : undefined;
				if (!associatedModel) {
					throw new Error(`Can not add relations to unloaded models; Config: ${JSON.stringify(config, null, 2)}`)
				}

				associatedModelAttributes = associatedModel.attributes;

			} catch (e) {
				console.error(`Error loading model for field ${key}:`, e);
			}

			displayField = getDisplayField(associatedModelAttributes);
			config = {
				...config,
				identifierField: "id",
				displayField: displayField,
			};
		}

		return config;
	}

	/**
	 * Normalizes the entire adminpanel configuration.
	 * Merges custom config with default config and handles normalization.
	 *
	 * @param config The custom config object
	 * @returns The normalized and merged config
	 */
	public static normalizeConfig(config: AdminpanelConfig): AdminpanelConfig {
		const defaultConfig = getDefaultConfig();
		const defaultPrefix = defaultConfig.routePrefix;
		const routePrefix = config.routePrefix ?? defaultPrefix;

		// Built-in navbar links are written against the default prefix, so retarget
		// them whenever the app overrides routePrefix (otherwise they 404).
		const builtinLinks = (defaultConfig.navbar?.additionalLinks || []).map((item) =>
			typeof item.link === 'string' && item.link.startsWith(`${defaultPrefix}/`)
				? { ...item, link: routePrefix + item.link.slice(defaultPrefix.length) }
				: item
		);

		const mergedConfig = {
			...defaultConfig,
			...config,
			models: {
				...defaultConfig.models,
				...config.models
			},
			navbar: {
				...defaultConfig.navbar,
				...config.navbar,
				additionalLinks: [
					...builtinLinks,
					...(config.navbar?.additionalLinks || [])
				],
				// Merged per section name so an app declaring its own sections
				// keeps the built-in ones, while still being able to override them.
				sections: {
					...defaultConfig.navbar?.sections,
					...config.navbar?.sections
				}
			}
		};

		// Normalize auth config if it's a boolean
		if (typeof mergedConfig.auth === 'boolean') {
			mergedConfig.auth = { enable: mergedConfig.auth };
		}

		return mergedConfig;
	}
}


/**
 * function to determine the display field for associations.
 * Checks if 'name' or 'label' exists in model attributes, defaults to 'id'.
 *
 * @param attributes Model attributes
 * @returns Field name to use as display field
 */
function getDisplayField(attributes: any): string {
	return attributes.hasOwnProperty("name")
		? "name"
		: attributes.hasOwnProperty("label")
			? "label"
			: "id";
}

