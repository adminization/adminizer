import {ModelResource} from "../interfaces/types";
import {ActionType, AdminpanelConfig, CreateUpdateConfig, ModelConfig} from "../interfaces/adminpanelConfig";
import {AbstractModel} from "../lib/model/AbstractModel";
import {Adminizer} from "../lib/Adminizer";

/**
 * @deprecated need refactor actions
 */
type ActionConfig = CreateUpdateConfig

export class ControllerHelper {

    /**
     * Default configuration for ModelResource
     *
     * @see ControllerHelper.findConfig
     */
    private static _defaultModelConfig = {
        list: true,
        add: true,
        edit: true,
        remove: true,
        view: true
    };

    /**
     * Default configs that will be returned for action. If nothing exists in config file.
     *
     * @see ControllerHelper.findActionConfig
     */
    private static _defaultActionConfig = {
        fields: {}
    };

    /**
     * Check if given ModelResource config has all required properties
     *
     * @param {Object} config
     * @returns {boolean}
     * @private
     */
    private static _isValidModelConfig(config: ModelConfig): boolean {
        try {
            if(!config) throw `Config is not defined ${config}`
            return (typeof config === "object" && typeof config.model === "string");
        } catch (error) {
            Adminizer.log.error(error)
            return false
        }
    };

    /**
     * Normalizing ModelResource config.
     * Will return fulfilled configuration object.
     *
     * @see ControllerHelper._isValidModelConfig
     * @param modelResourceName
     * @param {Object} config
     * @returns {Object}
     * @private
     */
    private static _normalizeModelConfig(modelResourceName: string, config: ModelConfig | boolean): ModelConfig {
        if (typeof config === "boolean") {
            config = {
                model: modelResourceName,
                icon: 'description',
                title: modelResourceName
            }
        }

        if (!this._isValidModelConfig(config)) {
            Adminizer.log.error('Wrong ModelResource configuration, using default');
            config = {
                model: modelResourceName,
                icon: 'description',
                title: modelResourceName
            }
        }
        config = {...this._defaultModelConfig, ...config};
        return config;
    };

    /**
     * Normalize action config object
     *
     * @param {Object} config
     * @returns {Object}
     * @private
     */
    private static _normalizeActionConfig(config: ActionConfig): ActionConfig {
        //Adding fields
        config.fields = config.fields || {};
        return {...this._defaultActionConfig, ...config};
    };

    /**
     * Get ModelResource name
     *
     * @param {Request} req
     * @returns {?string}
     */
    public static findModelResourceName(req: ReqType): string {
            const models = req.adminizer.config.models;
            const requestedName = req.params.modelResourceName
                ?? req.params.model
                ?? req.originalUrl.split('/')[3];

            return this.resolveConfiguredResourceName(models, requestedName);
        }

    private static resolveConfiguredResourceName(models: AdminpanelConfig["models"] | undefined, requestedName: string): string {
        if (!models || !requestedName) {
            throw new Error(`Model "${requestedName}" not found`);
        }

        if (Object.prototype.hasOwnProperty.call(models, requestedName)) {
            return requestedName;
        }

        const candidates = Object.keys(models).filter((key) => key.toLowerCase() === requestedName.toLowerCase());
        if (candidates.length === 1) {
            return candidates[0];
        }
        if (candidates.length > 1) {
            throw new Error(`Model resource "${requestedName}" is ambiguous: ${candidates.join(", ")}`);
        }

        throw new Error(`Model "${requestedName}" not found`);
    }

    /**
     * Searches for config from admin panel
     *
     * @param {Request} req
     * @param {String} modelResourceName
     * @returns {?Object}
     */
        public static findModelConfig(req: ReqType, modelResourceName: string): ModelConfig {
            const models = req.adminizer.config.models;
            if (!models) {
                Adminizer.log.error('No models configuration found');
                return null;
            }

            try {
                const foundKey = this.resolveConfiguredResourceName(models, modelResourceName);
                return this._normalizeModelConfig(foundKey, models[foundKey]);
            } catch (error) {
                Adminizer.log.error(error);
                return null;
            }
        }
    /**
     * Will get action config from configuration file depending to given action
     *
     * Config will consist of all configuration props from config file.
     *
     * @example
     *
     *  {
     *      'fields': {
     *          name: 'Name',
     *          email: true,
     *          anotherField: {
     *              title: 'Another field',
     *              //... some more options here
     *          }
     *      }
     *  }
     *
     * @throws {Error} if req or actionType not passed
     * @param {Object} ModelResource ModelResource object with `name`, `config`, `model` {@link ControllerHelper.findModelResource}
     * @param {string} actionType Type of action that config should be loaded for. Example: list, edit, add, remove, view.
     * @returns {Object} Will return object with configs or default configs.
     */
    public static findActionConfig(modelResource: ModelResource, actionType: ActionType): ActionConfig {
        if (!modelResource || !actionType) {
            throw new Error('No `ModelResource` or `actionType` passed !');
        }
        let result = {...this._defaultActionConfig};
        if (!modelResource.config || !modelResource.config[actionType]) {
            return result;
        }
        /**
         * Here we could get true/false so need to update it to Object for later manipulations
         * In this function
         */
        if (typeof modelResource.config[actionType] === "boolean") {
            return result;
        }
        return this._normalizeActionConfig(modelResource.config[actionType] as ActionConfig);
    }

    /**
     * Will create ModelResource object from request.
     *
     * ModelResource Object will have this format:
     *
     * @example
     * ```javascript
     * {
     *  name: 'user',
     *  model: Model,
     *  config: { ... },
     *  uri: ''
     * }
     * ```
     *
     * @param req
     * @returns {Object}
     */
    public static findModelResource(req: ReqType): ModelResource {
        // Retrieve model name based on the request
        const modelResourceName = this.findModelResourceName(req);

        // Construct the ModelResource URI
        const modelResourceUri = `${req.adminizer.config.routePrefix}/model/${modelResourceName}`;

        // Initialize the ModelResource object
        const modelResource: ModelResource = {
            name: modelResourceName,
            uri: modelResourceUri,
            model: null,
            config: null
        };
        // Find and add the model configuration to the ModelResource
        modelResource.config = this.findModelConfig(req, modelResourceName);
        // Find and add the model itself to the ModelResource
        if (this._isValidModelConfig(modelResource.config)) {
            modelResource.model = req.adminizer.modelHandler.getResource(modelResourceName);
        }

        // Return the completed ModelResource object
        return modelResource;
    }
}


