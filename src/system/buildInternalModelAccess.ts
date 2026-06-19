import { AdminpanelConfig } from "../interfaces/adminpanelConfig";
import { InternalModelAccessMap } from "../interfaces/internalModelAccess";
import { ModelHandler } from "../lib/model/ModelHandler";

export function buildInternalModelAccess(
    config: AdminpanelConfig,
    modelHandler: ModelHandler
): InternalModelAccessMap | undefined {
    const accessMap = config.system?.internalModelAccess;
    const dynamicAccessMap: InternalModelAccessMap = {};

    addInternalAccessModels(dynamicAccessMap, "data-accessor", getDataAccessorInternalModels(config, modelHandler));
    addInternalAccessModels(dynamicAccessMap, "history", getHistoryInternalModels(config, modelHandler));

    if (!Object.keys(dynamicAccessMap).length) {
        return accessMap;
    }

    return {
        ...(accessMap ?? {}),
        ...Object.fromEntries(
            Object.entries(dynamicAccessMap).map(([scope, models]) => [
                scope,
                [...(accessMap?.[scope] ?? []), ...models]
            ])
        )
    };
}

function addInternalAccessModels(accessMap: InternalModelAccessMap, scope: string, models: string[]): void {
    if (!models.length) {
        return;
    }

    accessMap[scope] = Array.from(new Set(models));
}

function getDataAccessorInternalModels(
    config: AdminpanelConfig,
    modelHandler: ModelHandler
): string[] {
    const models: string[] = [];

    for (const [modelName, modelConfig] of Object.entries(config.models ?? {})) {
        if (!modelConfig || typeof modelConfig !== "object" || Array.isArray(modelConfig)) {
            continue;
        }

        const userAccessRelation = modelConfig.userAccessRelation;
        if (!userAccessRelation || typeof userAccessRelation !== "object" || Array.isArray(userAccessRelation)) {
            continue;
        }

        const model = modelHandler.model.get(modelConfig.model ?? modelName);
        const intermediateModelName = model?.attributes?.[userAccessRelation.field]?.model;
        if (intermediateModelName) {
            models.push(modelHandler.resolveModelName(intermediateModelName));
        }
    }

    return Array.from(new Set(models));
}

function getHistoryInternalModels(
    config: AdminpanelConfig,
    modelHandler: ModelHandler
): string[] {
    if (!config.history?.enabled) {
        return [];
    }

    return Array.from(new Set(modelHandler.model.keys()));
}
