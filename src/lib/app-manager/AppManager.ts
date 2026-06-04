import type {Adminizer} from "../Adminizer";
import {AbstractAdminizerApp, AppAsset, AppConfigPatch, AppController, AppDisposer, AppSetupContext} from "./AdminizerApp";
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
    private configLayerIndex = 0;

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

    catalog(catalog: AbstractCatalog): void {
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
