import type {Adminizer} from "../Adminizer";
import {
    AbstractAdminizerApp,
    AppAsset,
    AppConfigPatch,
    AppController,
    AppDisposer,
    AppEventHandler,
    AppEventName,
    AppCatalogResource,
    AppModelAccessResource,
    AppModelResource,
    AppRuntime,
    AppSetupContext
} from "./AdminizerApp";
import type {AccessRightsToken} from "../../interfaces/types";
import type {AbstractCatalog} from "../catalog/AbstractCatalog";

export type AppState = "registered" | "enabled" | "disabled" | "unregistered" | "failed";

interface InstalledApp {
    app: AbstractAdminizerApp;
    state: AppState;
    disposers: AppDisposer[];
}

class RuntimeAppSetupContext implements AppSetupContext {
    readonly disposers: AppDisposer[] = [];
    private readonly pendingRegistrations: Array<() => Promise<void>> = [];
    private configLayerIndex = 0;
    private modelAccessIndex = 0;

    constructor(
        private adminizer: Adminizer,
        private appName: string
    ) {}

    asset(asset: AppAsset): string {
        const resourceId = `${this.appName}:${asset.id}`;
        const url = this.adminizer.assetHandler.register(this.appName, asset);
        this.disposers.push(() => this.adminizer.assetHandler.unregister(resourceId));
        return url;
    }

    controller(controller: AppController): string {
        const resourceId = `${this.appName}:${controller.id ?? `${controller.method}:${controller.route}`}`;
        const url = this.adminizer.controllerHandler.register(this.appName, controller);
        this.disposers.push(() => this.adminizer.controllerHandler.unregister(resourceId));
        return url;
    }

    config(config: AppConfigPatch, id = `config-${++this.configLayerIndex}`): void {
        const resourceId = this.adminizer.configLayerHandler.register(this.appName, id, config);
        this.disposers.push(() => this.adminizer.configLayerHandler.unregister(resourceId));
    }

    accessRight(token: AccessRightsToken): void {
        const resourceId = this.adminizer.accessRightsHandler.register(this.appName, token);
        this.disposers.push(() => this.adminizer.accessRightsHandler.unregister(resourceId));
    }

    catalog(catalog: AppCatalogResource): void {
        this.pendingRegistrations.push(() => this.registerCatalog(catalog));
    }

    private async registerCatalog(catalogResource: AppCatalogResource): Promise<void> {
        const catalog = this.isCatalogFactory(catalogResource)
            ? await catalogResource.factory(this.createRuntime())
            : catalogResource;

        const resourceId = this.adminizer.catalogHandler.register(this.appName, catalog);
        this.adminizer.emitter.emit("app:catalog:registered", {
            appName: this.appName,
            resourceId,
            slug: catalog.slug,
        });
        this.disposers.push(() => {
            this.adminizer.catalogHandler.unregister(resourceId);
            this.adminizer.emitter.emit("app:catalog:unregistered", {
                appName: this.appName,
                resourceId,
                slug: catalog.slug,
            });
        });
    }

    private isCatalogFactory(catalog: AppCatalogResource): catalog is Exclude<AppCatalogResource, AbstractCatalog> {
        return "factory" in catalog;
    }

    model<T = any>(model: AppModelResource<T>): void {
        this.pendingRegistrations.push(() => this.registerModel(model));
    }

    async waitForPendingRegistrations(): Promise<void> {
        for (const registration of this.pendingRegistrations) {
            await registration();
        }
    }

    private async registerModel<T = any>(model: AppModelResource<T>): Promise<void> {
        const modelInstance = await this.createModelFromRuntimeDefinition(model);
        const resourceId = this.adminizer.modelHandler.register(this.appName, model.name, modelInstance);
        this.adminizer.emitter.emit("app:model:registered", {
            appName: this.appName,
            resourceId,
            modelName: model.name,
        });
        this.disposers.push(() => {
            this.adminizer.modelHandler.unregister(resourceId);
            this.adminizer.emitter.emit("app:model:unregistered", {
                appName: this.appName,
                resourceId,
                modelName: model.name,
            });
        });
    }

    private async createModelFromRuntimeDefinition<T = any>(model: AppModelResource<T>) {
        const ormAdapter = this.resolveModelAdapter(model.adapter);
        const registeredModel = await ormAdapter.registerRuntimeModel({
            modelName: model.name,
            schema: model.schema,
            sync: model.sync,
        });

        return new ormAdapter.Model(model.name, registeredModel);
    }

    private resolveModelAdapter(adapterName?: string) {
        const resolvedAdapterName = adapterName ?? this.adminizer.config.system?.defaultORM;
        if (resolvedAdapterName) {
            const adapter = this.adminizer.getOrmAdapter(resolvedAdapterName);
            if (!adapter) {
                throw new Error(`Adapter "${resolvedAdapterName}" was not found`);
            }
            return adapter;
        }

        if (this.adminizer.ormAdapters.length === 1) {
            return this.adminizer.ormAdapters[0];
        }

        throw new Error(`Adapter was not provided for app model registration "${this.appName}"`);
    }

    modelAccess(access: AppModelAccessResource): void {
        this.pendingRegistrations.push(() => this.registerModelAccess(access));
    }

    private async registerModelAccess(access: AppModelAccessResource): Promise<void> {
        const resourceId = this.adminizer.modelHandler.registerAppAccess(
            this.appName,
            access.id ?? `model-access-${++this.modelAccessIndex}`,
            access.models
        );
        this.adminizer.emitter.emit("app:model-access:registered", {
            appName: this.appName,
            resourceId,
            models: access.models,
        });
        this.disposers.push(() => {
            this.adminizer.modelHandler.unregisterAppAccess(resourceId);
            this.adminizer.emitter.emit("app:model-access:unregistered", {
                appName: this.appName,
                resourceId,
                models: access.models,
            });
        });
    }

    listener(event: AppEventName, handler: AppEventHandler): void {
        const resourceId = `${this.appName}:${event.toString()}:${this.disposers.length + 1}`;
        const listener = (payload: unknown) => handler(payload, this.createRuntime());
        this.adminizer.emitter.on(event, listener);
        this.adminizer.emitter.emit("app:listener:registered", {
            appName: this.appName,
            resourceId,
            event,
        });
        this.disposers.push(() => {
            this.adminizer.emitter.off(event, listener);
            this.adminizer.emitter.emit("app:listener:unregistered", {
                appName: this.appName,
                resourceId,
                event,
            });
        });
    }

    private createRuntime(): AppRuntime {
        return {
            models: this.adminizer.modelHandler.createAppAccess(this.appName),
            config: {
                routePrefix: this.adminizer.config.routePrefix,
                getModelConfig: (modelName: string) => {
                    const models = this.adminizer.config.models ?? {};
                    const modelKey = Object.keys(models).find((key) => key.toLowerCase() === modelName.toLowerCase());
                    return modelKey ? models[modelKey] : undefined;
                },
            },
        };
    }
}

export class AppManager {
    private installedApps = new Map<string, InstalledApp>();

    constructor(private adminizer: Adminizer) {}

    register(app: AbstractAdminizerApp): void {
        if (this.installedApps.has(app.name)) {
            throw new Error(`App "${app.name}" is already registered`);
        }

        this.installedApps.set(app.name, {
            app,
            state: "registered",
            disposers: [],
        });
        this.adminizer.emitter.emit("app:registered", {
            appName: app.name,
            version: app.version,
        });
    }

    async enable(appOrName: AbstractAdminizerApp | string): Promise<void> {
        const appName = typeof appOrName === "string" ? appOrName : appOrName.name;
        if (typeof appOrName !== "string" && !this.installedApps.has(appName)) {
            this.register(appOrName);
        }

        const installed = this.installedApps.get(appName);
        if (!installed) {
            throw new Error(`App "${appName}" is not registered`);
        }

        if (installed.state === "enabled") {
            return;
        }

        installed.disposers = [];
        installed.state = "registered";
        this.adminizer.emitter.emit("app:enable:start", {
            appName,
            version: installed.app.version,
        });

        const ctx = new RuntimeAppSetupContext(this.adminizer, appName);
        try {
            await installed.app.setup(ctx);
            await ctx.waitForPendingRegistrations();
            installed.disposers.push(...ctx.disposers);

            installed.state = "enabled";
            this.adminizer.emitter.emit("app:enabled", {
                appName,
                version: installed.app.version,
                resources: installed.disposers.length,
            });
        } catch (error) {
            installed.state = "failed";
            await this.disposeResources(installed);
            this.adminizer.emitter.emit("app:enable:failed", {
                appName,
                error,
            });
            throw error;
        }
    }

    async disable(appName: string): Promise<void> {
        const installed = this.installedApps.get(appName);
        if (!installed || installed.state !== "enabled") {
            return;
        }

        this.adminizer.emitter.emit("app:disable:start", {
            appName,
        });

        await this.disposeResources(installed);
        installed.state = "disabled";
        this.adminizer.emitter.emit("app:disabled", {
            appName,
        });
    }

    async unregister(appName: string): Promise<void> {
        const installed = this.installedApps.get(appName);
        if (!installed) {
            return;
        }

        await this.disable(appName);
        this.installedApps.delete(appName);
        installed.state = "unregistered";
        this.adminizer.emitter.emit("app:unregistered", {
            appName,
        });
    }

    getInstalledApps(): string[] {
        return Array.from(this.installedApps.keys());
    }

    getApp(name: string): AbstractAdminizerApp | undefined {
        return this.installedApps.get(name)?.app;
    }

    getState(name: string): AppState | undefined {
        return this.installedApps.get(name)?.state;
    }

    private async disposeResources(installed: InstalledApp): Promise<void> {
        for (const dispose of [...installed.disposers].reverse()) {
            await dispose();
        }
        installed.disposers = [];
    }
}
