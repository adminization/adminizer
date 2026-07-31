import type {ModelConfig} from '../interfaces/adminpanelConfig';
import type {ModelResource} from '../interfaces/types';
import type {Adminizer} from '../lib/Adminizer';

/** Config defaults of a model resource declared as `true` in the panel config. */
export function normalizeModelConfig(name: string, config: ModelConfig | boolean): ModelConfig {
    const baseConfig: ModelConfig = {
        model: name,
        icon: "description",
        title: name,
        list: true,
        add: true,
        edit: true,
        remove: true,
        view: true,
    } as ModelConfig;

    if (typeof config === "boolean") {
        return config ? baseConfig : {...baseConfig, list: false, add: false, edit: false, remove: false, view: false};
    }

    return {...baseConfig, ...config};
}

/** Every configured model resource whose model is actually registered. */
export function listModelResources(adminizer: Adminizer): ModelResource[] {
    const resources: ModelResource[] = [];

    for (const [configName, configValue] of Object.entries(adminizer.config.models ?? {})) {
        const config = normalizeModelConfig(configName, configValue);
        const model = adminizer.modelHandler.model.get(config.model.toLowerCase());
        if (!model) continue;

        resources.push({
            name: configName,
            uri: `${adminizer.config.routePrefix}/model/${configName}`,
            config,
            model,
        });
    }

    return resources;
}

/** Resolves a resource by its config key or by the underlying model name. */
export function resolveModelResource(adminizer: Adminizer, modelName: string): ModelResource | undefined {
    const loweredName = modelName.trim().toLowerCase();
    return listModelResources(adminizer).find((resource) =>
        resource.name.toLowerCase() === loweredName || resource.config?.model?.toLowerCase() === loweredName);
}
