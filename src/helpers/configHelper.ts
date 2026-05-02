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

		let config = this.adminizer.config;
		let modelConfig: ModelConfig;
		Object.keys(config.models).forEach((entityName) => {
			const model = config.models[entityName];
			if (typeof model !== "boolean") {
				if (model.model === modelName.toLowerCase()) {
					if (typeof config.models[entityName] !== "boolean") {
						modelConfig = config.models[entityName] as ModelConfig
					}
				}
			}
		})

		if (modelConfig && modelConfig.identifierField) {
			return modelConfig.identifierField;
		} else if (this.adminizer.modelHandler.model.get(modelName.toLowerCase()).primaryKey) {
			return this.adminizer.modelHandler.model.get(modelName.toLowerCase()).primaryKey
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
	 * Normalizes field configuration from various formats.
	 *
	 * @param adminizer
	 * @param config Field configuration in boolean, string, or object notation
	 * @param key Field key name
	 * @param modelField Field model configuration
	 * @returns Normalized field configuration or `false` if the field should be hidden
	 */
	public normalizeFieldConfig(
		adminizer: Adminizer,
		config: string | boolean | BaseFieldConfig,
		key: string,
		modelField: Attribute
	): false | BaseFieldConfig {
		if (typeof config === "undefined" || typeof key === "undefined") {
			throw new Error('No `config` or `key` passed!');
		}

		// Boolean notation: `true` means field is visible; `false` means field is hidden.
		if (typeof config === "boolean") {
			return config ? { title: key } : { visible: false };
		}

		// String notation: Interpreted as the field title.
		if (typeof config === "string") {
			return { title: config };
		}

		// Object notation: Allows full customization of the field.
		if (typeof config === "object" && config !== null) {
			config.title = config.title || key;

			config.visible = config.visible === undefined ? true : Boolean(config.visible)

			// For association types, determine display field by checking model attributes.
			if (["association", "association-many"].includes(config.type)) {
				let associatedModelAttributes = {};
				let displayField: string;

				try {
					const associatedModelName =
						config.type === "association"
							? modelField.model.toLowerCase()
							: modelField.collection.toLowerCase();

					const associatedModel = adminizer.modelHandler.model.get(associatedModelName);
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

		return false;
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

		const {
			forms: configForms = {} as AdminpanelConfig['forms'],
			...restConfig
		} = config;

		const {
			forms: defaultForms = {} as AdminpanelConfig['forms'],
		} = defaultConfig;

		const mergedConfig = {
			...defaultConfig,
			...restConfig,
			models: {
				...defaultConfig.models,
				...config.models
			},
			navbar: {
				...defaultConfig.navbar,
				...config.navbar,
				additionalLinks: [
					...(defaultConfig.navbar?.additionalLinks || []),
					...(config.navbar?.additionalLinks || [])
				]
			},
			forms: {
				path: configForms.path ?? defaultForms.path,
				data: {
					...defaultForms.data,
					...configForms.data
				},
				get: configForms.get ?? defaultForms.get,
				set: configForms.set ?? defaultForms.set
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
