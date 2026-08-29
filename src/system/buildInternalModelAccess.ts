import { AdminpanelConfig } from "../interfaces/adminpanelConfig";
import { InternalModelAccessMap } from "../interfaces/internalModelAccess";
import { collectAccessGraphInternalModels } from "../lib/access-graph/AccessGraphResolver";
import { ModelHandler } from "../lib/model/ModelHandler";
import type { Adminizer } from "../lib/Adminizer";

/**
 * Rebuilds the internal-scope allowlists from the current config and model registry.
 * Called at boot, synchronously on config rebuilds (app config layers), and lazily on the
 * next internal access after any model-registry mutation — Adminizer installs it as the
 * registry's refresher. Must not throw on a broken app graph — graph problems only log
 * and the affected models fail closed.
 */
export function refreshInternalModelAccess(adminizer: Adminizer): void {
    if (!adminizer.config) {
        return;
    }

    adminizer.modelHandler.configureInternalAccess(
        buildInternalModelAccess(adminizer.config, adminizer.modelHandler)
    );
}

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

		// Must mirror what the resolver queries at request time. Membership form: the
		// `through` model resolved as a resource name/alias (getResourceRecord) plus the
		// literal "Group" when declared — the membership target `field` points at is never
		// fetched through the internal scope. Via form: the intermediate model.
		if (userAccessRelation.through) {
			const throughResource = modelHandler.getResourceRecord(userAccessRelation.through)?.name;
			if (throughResource) {
				models.push(throughResource);
			}
			if (userAccessRelation.group) {
				models.push("Group");
			}
		} else {
			const model = modelHandler.getResource(modelName);
			const intermediateModelName = model?.attributes?.[userAccessRelation.field]?.model;
			if (intermediateModelName) {
				const resourceName = modelHandler.resolveAssociationResource(
					intermediateModelName,
					model?.attributes?.[userAccessRelation.field]?.resourceName
				);
				if (resourceName) {
					models.push(resourceName);
				}
			}
		}
    }

    models.push(...collectAccessGraphInternalModels(config.accessGraph, modelHandler));

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
