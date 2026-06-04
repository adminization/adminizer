import { InternalModelAccessMap, InternalModelRepository } from "../../interfaces/internalModelAccess";
import { AbstractModel } from "./AbstractModel";
import { createInternalModelRepository } from "./internalModelRepository";

export const DEFAULT_INTERNAL_MODEL_ACCESS: InternalModelAccessMap = {
    auth: ["UserAP", "GroupAP"],
    "access-rights": ["UserAP", "GroupAP"],
    users: ["UserAP", "GroupAP"],
    filters: ["FilterAP", "FilterColumnAP", "UserAP", "GroupAP"],
    "media-manager": [
        "MediaManagerAP",
        "MediaManagerMetaAP",
        "MediaManagerAssociationsAP",
        "HistoryActionsAP"
    ],
    history: ["HistoryActionsAP", "UserAP"],
    "data-accessor": [],
    notifications: ["NotificationAP", "UserNotificationAP", "UserAP"],
    feed: ["FilterAP", "UserAP"],
    widgets: ["UserAP", "FilterAP"]
};

function normalizeName(name: string): string {
    return name.toLowerCase();
}

function normalizeAccessMap(accessMap: InternalModelAccessMap): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();

    for (const [scope, models] of Object.entries(accessMap)) {
        result.set(normalizeName(scope), new Set(models.map(normalizeName)));
    }

    return result;
}

function mergeAccessMaps(base: InternalModelAccessMap, extra?: InternalModelAccessMap): InternalModelAccessMap {
    const merged: InternalModelAccessMap = {...base};

    if (!extra) {
        return merged;
    }

    for (const [scope, models] of Object.entries(extra)) {
        merged[scope] = [...(merged[scope] ?? []), ...models];
    }

    return merged;
}

export class InternalModelScope {
    constructor(
        private readonly getModel: (modelName: string) => AbstractModel<any> | undefined,
        private readonly scopeName: string,
        private readonly allowedModels: Set<string>
    ) {}

    get<T = any>(modelName: string): InternalModelRepository<T> {
        const normalizedModelName = normalizeName(modelName);

        if (!this.allowedModels.has(normalizedModelName)) {
            throw new Error(
                `Internal model access denied: scope "${this.scopeName}" cannot use model "${modelName}"`
            );
        }

        const model = this.getModel(modelName) as AbstractModel<T> | undefined;
        if (!model) {
            throw new Error(`Internal model access failed: model "${modelName}" was not found`);
        }

        return createInternalModelRepository<T>(modelName, model);
    }

    has(modelName: string): boolean {
        return this.allowedModels.has(normalizeName(modelName));
    }
}

export class InternalModelAccessFactory {
    private readonly accessMap: Map<string, Set<string>>;

    constructor(
        private readonly getModel: (modelName: string) => AbstractModel<any> | undefined,
        accessMap?: InternalModelAccessMap
    ) {
        this.accessMap = normalizeAccessMap(mergeAccessMaps(DEFAULT_INTERNAL_MODEL_ACCESS, accessMap));
    }

    scope(scopeName: string): InternalModelScope {
        const normalizedScopeName = normalizeName(scopeName);
        const allowedModels = this.accessMap.get(normalizedScopeName);

        if (!allowedModels) {
            throw new Error(`Internal model access scope "${scopeName}" is not registered`);
        }

        return new InternalModelScope(this.getModel, scopeName, allowedModels);
    }

    canUse(scopeName: string, modelName: string): boolean {
        return this.accessMap.get(normalizeName(scopeName))?.has(normalizeName(modelName)) ?? false;
    }
}
