import type {Adminizer} from "../Adminizer";
import type {AppConfigPatch} from "./AdminizerApp";
import {refreshInternalModelAccess} from "../../system/buildInternalModelAccess";

export interface ConfigLayerRecord {
    id: string;
    appName: string;
    patch: AppConfigPatch;
}

function cloneConfigValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => cloneConfigValue(item)) as T;
    }

    if (isPlainObject(value)) {
        const cloned: Record<string, unknown> = {};
        for (const [key, nestedValue] of Object.entries(value)) {
            cloned[key] = cloneConfigValue(nestedValue);
        }
        return cloned as T;
    }

    return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function hasStringId(value: unknown): value is { id: string } {
    return isPlainObject(value) && typeof value.id === "string";
}

function mergeArrays(base: unknown[], patch: unknown[]): unknown[] {
    if (!patch.length) {
        return cloneConfigValue(base);
    }

    const shouldMergeById = patch.every(hasStringId);
    if (!shouldMergeById) {
        return [...cloneConfigValue(base), ...cloneConfigValue(patch)];
    }

    const merged = cloneConfigValue(base);
    for (const patchItem of patch) {
        const index = merged.findIndex((item) => hasStringId(item) && item.id === patchItem.id);
        if (index === -1) {
            merged.push(cloneConfigValue(patchItem));
        } else {
            merged[index] = mergeConfigValues(merged[index], patchItem);
        }
    }

    return merged;
}

function mergeConfigValues(base: unknown, patch: unknown): unknown {
    if (patch === undefined) {
        return cloneConfigValue(base);
    }

    if (Array.isArray(patch)) {
        return mergeArrays(Array.isArray(base) ? base : [], patch);
    }

    if (isPlainObject(patch)) {
        const merged: Record<string, unknown> = isPlainObject(base) ? cloneConfigValue(base) : {};
        for (const [key, value] of Object.entries(patch)) {
            merged[key] = mergeConfigValues(merged[key], value);
        }
        return merged;
    }

    return patch;
}

export class ConfigLayerHandler {
    private baseConfig?: AppConfigPatch;
    private layers = new Map<string, ConfigLayerRecord>();

    constructor(private adminizer: Adminizer) {}

    register(appName: string, layerId: string, patch: AppConfigPatch): string {
        const id = this.getLayerId(appName, layerId);
        if (this.layers.has(id)) {
            throw new Error(`Config layer "${id}" is already registered`);
        }
        if (!this.adminizer.config) {
            throw new Error("Adminizer config must be initialized before registering app config layers");
        }

        if (!this.baseConfig) {
            this.baseConfig = cloneConfigValue(this.adminizer.config);
        }

        this.layers.set(id, {
            id,
            appName,
            patch: cloneConfigValue(patch),
        });
        this.rebuildConfig();
        this.adminizer.emitter.emit("app:config:registered", {
            appName,
            resourceId: id,
        });

        return id;
    }

    unregister(id: string): void {
        const layer = this.layers.get(id);
        if (!layer) {
            return;
        }

        this.layers.delete(id);
        this.rebuildConfig();
        this.adminizer.emitter.emit("app:config:unregistered", {
            appName: layer.appName,
            resourceId: id,
        });
    }

    getByApp(appName: string): ConfigLayerRecord[] {
        return Array.from(this.layers.values()).filter((layer) => layer.appName === appName);
    }

    private rebuildConfig(): void {
        if (!this.baseConfig) {
            return;
        }

        const rebuilt = Array.from(this.layers.values()).reduce(
            (config, layer) => mergeConfigValues(config, layer.patch) as AppConfigPatch,
            cloneConfigValue(this.baseConfig)
        );

        const targetConfig = this.adminizer.config as unknown as Record<string, unknown>;
        for (const key of Object.keys(targetConfig)) {
            delete targetConfig[key];
        }
        Object.assign(this.adminizer.config, rebuilt);

        // The rebuilt config may change what the record-access resolvers query (e.g. an
        // app-patched accessGraph), so the internal allowlists must follow synchronously.
        refreshInternalModelAccess(this.adminizer);
    }

    private getLayerId(appName: string, layerId: string): string {
        return `${appName}:${layerId}`;
    }
}
