import {Adminizer} from "../Adminizer";
import {
    AbstractAdminizerApp,
    AppAsset,
    AppControlResource,
    AppConfigPatch,
    AppController,
    AppDisposer,
    AppEventHandler,
    AppEventName,
    AppCatalogFactoryResource,
    AppAiAssistantContext,
    AppAiAssistantResource,
    AppAiAssistantUiMethodResource,
    AppAiAssistantAgentSkillResource,
    AppSkills,
    AppAdminLinkResource,
    AppAdminLinkTemplateResource,
    AppMediaManagerResource,
    AppModelAccessResource,
    AppModelResource,
    AppRuntime,
    AppRuntimeAppState,
    AppSetupContext,
    AppWidgetResource
} from "./AdminizerApp";
import type {AccessRightsToken, ModelResource} from "../../interfaces/types";
import type {ModelConfig} from "../../interfaces/adminpanelConfig";
import type {Control} from "../controls/Control";
import type {WidgetType} from "../widgets/widgetHandler";
import type {WidgetInfoContext} from "../widgets/abstractInfo";
import {DataAccessor} from "../DataAccessor";
import {listModelResources, resolveModelResource} from "../../helpers/modelResourceHelper";

export type AppState = AppRuntimeAppState;

interface InstalledApp {
    app: AbstractAdminizerApp;
    state: AppState;
    disposers: AppDisposer[];
}

class RuntimeAppSetupContext implements AppSetupContext {
    readonly disposers: AppDisposer[] = [];
    private readonly pendingModelRegistrations: Array<() => Promise<void>> = [];
    private readonly pendingModelAccessRegistrations: Array<() => Promise<void>> = [];
    private readonly pendingAiAssistantRegistrations: Array<() => Promise<void>> = [];
    private readonly pendingAiAssistantUiMethodRegistrations: Array<() => Promise<void>> = [];
    private readonly pendingAiAssistantAgentSkillRegistrations: Array<() => Promise<void>> = [];
    private readonly pendingMediaManagerRegistrations: Array<() => Promise<void>> = [];
    private readonly pendingCatalogRegistrations: Array<() => Promise<void>> = [];
    private configLayerIndex = 0;
    private modelAccessIndex = 0;

    constructor(
        private adminizer: Adminizer,
        private appName: string
    ) {
        this.skills = {
            uiMethod: (method) => this.registerAiAssistantUiMethod(method),
            agent: (skill) => this.registerAiAssistantAgentSkill(skill),
        };
    }

    readonly skills: AppSkills;

    asset(asset: AppAsset): string {
        const resourceId = `${this.appName}:${asset.id}`;
        const url = this.adminizer.assetHandler.register(this.appName, asset);
        this.disposers.push(() => this.adminizer.assetHandler.unregister(resourceId));
        return url;
    }

    control(resource: AppControlResource): void {
        const jsUrl = this.asset(resource.component);
        const cssUrl = resource.stylesheet ? this.asset(resource.stylesheet) : undefined;
        const control: Control = {
            name: resource.name,
            type: resource.type,
            getName: () => resource.name,
            getConfig: () => resource.config,
            getJsPath: () => jsUrl,
            getCssPath: () => cssUrl,
        };
        const resourceId = `${this.appName}:${resource.id ?? `${resource.type}:${resource.name}`}`;

        this.adminizer.controlsHandler.add(control);
        this.adminizer.emitter.emit("app:control:registered", {
            appName: this.appName,
            resourceId,
            type: resource.type,
            name: resource.name,
            jsUrl,
            cssUrl,
        });
        this.disposers.push(() => {
            if (this.adminizer.controlsHandler.get(resource.type, resource.name) === control) {
                this.adminizer.controlsHandler.remove(resource.type, resource.name);
            }
            this.adminizer.emitter.emit("app:control:unregistered", {
                appName: this.appName,
                resourceId,
                type: resource.type,
                name: resource.name,
            });
        });
    }

    widget(resource: AppWidgetResource): void {
        if (this.adminizer.widgetHandler.getById(resource.id)) {
            throw new Error(`Widget "${resource.id}" is already registered`);
        }

        const accessRightsToken = resource.accessRightsToken ?? `widget-${resource.id}`;
        if (!resource.accessRightsToken) {
            this.accessRight({
                id: accessRightsToken,
                name: resource.name,
                description: resource.description,
                department: resource.department,
            });
        }

        const widget = this.createWidget(resource, accessRightsToken);
        this.adminizer.widgetHandler.add(widget);
        this.adminizer.emitter.emit("app:widget:registered", {
            appName: this.appName,
            resourceId: `${this.appName}:${resource.id}`,
            type: resource.type,
            id: resource.id,
        });
        this.disposers.push(() => {
            this.adminizer.widgetHandler.removeById(resource.id);
            this.adminizer.emitter.emit("app:widget:unregistered", {
                appName: this.appName,
                resourceId: `${this.appName}:${resource.id}`,
                type: resource.type,
                id: resource.id,
            });
        });
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

    catalog(catalog: AppCatalogFactoryResource): void {
        this.pendingCatalogRegistrations.push(() => this.registerCatalog(catalog));
    }

    model(model: AppModelResource): void {
        this.pendingModelRegistrations.push(() => this.registerModel(model));
    }

    modelAccess(access: AppModelAccessResource): void {
        this.pendingModelAccessRegistrations.push(() => this.registerModelAccess(access));
    }

    mediaManager(resource: AppMediaManagerResource): void {
        this.pendingMediaManagerRegistrations.push(() => this.registerMediaManager(resource));
    }

    aiAssistant(resource: AppAiAssistantResource): void {
        this.pendingAiAssistantRegistrations.push(() => this.registerAiAssistant(resource));
    }

    private registerAiAssistantUiMethod(method: AppAiAssistantUiMethodResource): void {
        this.pendingAiAssistantUiMethodRegistrations.push(async () => {
            this.adminizer.aiAssistantUiMethodHandler.register(method, this.appName);
            this.disposers.push(() => this.adminizer.aiAssistantUiMethodHandler.unregister(method.id, this.appName));
        });
    }

    private registerAiAssistantAgentSkill(skill: AppAiAssistantAgentSkillResource): void {
        this.pendingAiAssistantAgentSkillRegistrations.push(async () => {
            this.adminizer.aiAssistantAgentSkillHandler.add(skill, this.appName);
            this.disposers.push(() => {
                this.adminizer.aiAssistantAgentSkillHandler.remove(skill.id, this.appName);
            });
        });
    }

    adminLink(link: AppAdminLinkResource): void {
        const resourceId = this.adminizer.adminLinkHandler.add(link, this.appName);
        this.disposers.push(() => {
            this.adminizer.adminLinkHandler.remove(resourceId, this.appName);
        });
    }

    adminLinkTemplate(template: AppAdminLinkTemplateResource): void {
        const resourceId = this.adminizer.adminLinkHandler.addTemplate(template, this.appName);
        this.disposers.push(() => {
            this.adminizer.adminLinkHandler.removeTemplate(resourceId, this.appName);
        });
    }

    listener(event: AppEventName, handler: AppEventHandler): void {
        const resourceId = `${this.appName}:${event.toString()}:${this.disposers.length + 1}`;
        const listener = (payload: unknown) => handler(payload, this.adminizer.appManager.createRuntime(this.appName));
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

    async waitForPendingRegistrations(): Promise<void> {
        await this.runRegistrationPhase(this.pendingModelRegistrations);
        await this.runRegistrationPhase(this.pendingModelAccessRegistrations);
        await this.runRegistrationPhase(this.pendingAiAssistantRegistrations);
        await this.runRegistrationPhase(this.pendingAiAssistantUiMethodRegistrations);
        await this.runRegistrationPhase(this.pendingAiAssistantAgentSkillRegistrations);
        await this.runRegistrationPhase(this.pendingMediaManagerRegistrations);
        await this.runRegistrationPhase(this.pendingCatalogRegistrations);
    }

    private async registerAiAssistant(resource: AppAiAssistantResource): Promise<void> {
        // Models go into the shared handler instead of replacing it, so models
        // registered directly by the host application keep working and several
        // apps can contribute models at the same time.
        const handler = this.adminizer.aiAssistantHandler;
        const context = this.createAiAssistantContext();
        const modelIds: string[] = [];

        for (const modelFactory of resource.models) {
            const model = await modelFactory(context);
            handler.registerModel(model, this.appName);
            modelIds.push(model.id);
        }

        this.adminizer.emitter.emit("app:ai-assistant:registered", {
            appName: this.appName,
            models: modelIds,
        });

        this.disposers.push(() => {
            for (const modelId of modelIds) {
                this.adminizer.aiAssistantHandler.unregisterModel(modelId, this.appName);
            }
            this.adminizer.emitter.emit("app:ai-assistant:unregistered", {
                appName: this.appName,
                models: modelIds,
            });
        });
    }

    private async registerMediaManager(resource: AppMediaManagerResource): Promise<void> {
        const manager = await resource.factory(this.adminizer.appManager.createRuntime(this.appName));
        const resourceId = this.adminizer.mediaManagerHandler.register(this.appName, manager);
        this.adminizer.emitter.emit("app:media-manager:registered", {
            appName: this.appName,
            resourceId,
            managerId: manager.id,
        });
        this.disposers.push(() => {
            this.adminizer.mediaManagerHandler.unregister(resourceId);
            this.adminizer.emitter.emit("app:media-manager:unregistered", {
                appName: this.appName,
                resourceId,
                managerId: manager.id,
            });
        });
    }

    private async registerCatalog(catalogResource: AppCatalogFactoryResource): Promise<void> {
        const catalog = await catalogResource.factory(this.adminizer.appManager.createRuntime(this.appName));

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

        for (const template of catalogResource.templates ?? []) {
            const templateResourceId = this.adminizer.catalogTemplateComponentHandler.register(
                this.appName,
                catalog.slug,
                template
            );
            this.adminizer.emitter.emit("app:catalog-template-component:registered", {
                appName: this.appName,
                resourceId: templateResourceId,
                catalog: catalog.slug,
                type: template.type,
            });
            this.disposers.push(() => {
                this.adminizer.catalogTemplateComponentHandler.unregister(templateResourceId);
                this.adminizer.emitter.emit("app:catalog-template-component:unregistered", {
                    appName: this.appName,
                    resourceId: templateResourceId,
                    catalog: catalog.slug,
                    type: template.type,
                });
            });
        }
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

    private async registerModel(model: AppModelResource): Promise<void> {
        const ormAdapter = this.resolveModelAdapter(model.adapter);
        const registeredModel = ormAdapter.getModel(model.name);
        if (!registeredModel) {
            if (ormAdapter.ormType === "typeorm") {
                throw new Error(
                    `App "${this.appName}" requires TypeORM entity "${model.name}". ` +
                    "TypeORM entities must be registered in DataSource before initialize(). " +
                    "Dynamic app model installation is supported only for Sequelize."
                );
            }
            throw new Error(
                `App "${this.appName}" requires model "${model.name}", but it was not provided by adapter ` +
                `"${ormAdapter.ormType}". Install the app model before enabling the app.`
            );
        }

        const modelInstance = new ormAdapter.Model(model.name, registeredModel);
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

    private async runRegistrationPhase(registrations: Array<() => Promise<void>>): Promise<void> {
        for (const registration of registrations) {
            await registration();
        }
    }

    private createWidget(resource: AppWidgetResource, accessRightsToken: string): WidgetType {
        const runtime = () => this.adminizer.appManager.createRuntime(this.appName);
        const base = {
            id: resource.id,
            name: resource.name,
            description: resource.description,
            icon: resource.icon,
            department: resource.department,
            backgroundCSS: resource.backgroundCSS ?? null,
            size: resource.size ?? null,
            accessRightsToken,
            group: resource.group,
        };

        if (resource.type === "info") {
            return {
                ...base,
                widgetType: "info",
                link: resource.link,
                linkType: resource.linkType,
                getInfo: (context?: WidgetInfoContext) => resource.getInfo({
                    ...context,
                    runtime: runtime(),
                }),
            } as WidgetType;
        }

        if (resource.type === "switcher") {
            return {
                ...base,
                widgetType: "switcher",
                getState: () => resource.getState({
                    runtime: runtime(),
                }),
                switchIt: () => resource.switchIt({
                    runtime: runtime(),
                }),
            } as WidgetType;
        }

        if (resource.type === "action") {
            return {
                ...base,
                widgetType: "action",
                action: () => resource.action({
                    runtime: runtime(),
                }),
            } as WidgetType;
        }

        if (resource.type === "link") {
            return {
                ...base,
                widgetType: "link",
                links: resource.links,
                getLinks: async () => resource.links,
            } as WidgetType;
        }

        const scriptUrl = this.asset(resource.component);
        return {
            ...base,
            widgetType: "custom",
            routePrefix: this.adminizer.config.routePrefix,
            jsPath: {
                dev: scriptUrl,
                production: scriptUrl,
            },
            scriptUrl,
        } as WidgetType;
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

    private createAiAssistantContext(): AppAiAssistantContext {
        return {
            runtime: this.adminizer.appManager.createRuntime(this.appName),
            routePrefix: this.adminizer.config.routePrefix,
            getModelResources: () => listModelResources(this.adminizer),
            resolveModelResource: (modelName: string) => resolveModelResource(this.adminizer, modelName),
            checkPermission: (token, user) => this.adminizer.accessRightsHelper.checkPermission(token, user),
            hasPermission: (token, user) => this.adminizer.accessRightsHelper.hasPermission(token, user),
            createDataAccessor: (modelResource, user, action) =>
                new DataAccessor(this.adminizer, user, modelResource, action),
            getUiMethods: (user) => this.adminizer.aiAssistantUiMethodHandler.getAvailable(user),
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

        if (this.adminizer.config.system?.defaultORM === "typeorm") {
            Adminizer.log.warn(
                `App "${appName}" is being enabled with experimental TypeORM support. ` +
                "App entities must be registered before DataSource.initialize(); dynamic model installation is unavailable."
            );
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
            installed.disposers.push(...ctx.disposers);
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

    createRuntime(appName: string): AppRuntime {
        return {
            models: this.adminizer.modelHandler.createAppAccess(appName),
            config: {
                routePrefix: this.adminizer.config.routePrefix,
                getModelConfig: (modelName: string) => {
                    const models = this.adminizer.config.models ?? {};
                    const modelKey = Object.keys(models).find((key) => key.toLowerCase() === modelName.toLowerCase());
                    return modelKey ? models[modelKey] : undefined;
                },
            },
            accessRights: {
                checkPermission: (token, user, context) =>
                    this.adminizer.accessRightsHelper.checkPermission(token, user, context),
                // Synchronous, like the helper method it forwards to: an app built against the
                // pre-async runtime calls this without awaiting, and a promise would read as
                // "granted" there. See `AccessRightsHelper.hasPermission`.
                hasPermission: (token, user) =>
                    this.adminizer.accessRightsHelper.hasPermission(token, user),
                getPermissionRights: (token, user) =>
                    this.adminizer.accessRightsHelper.getPermissionRights(token, user),
            },
            notifications: {
                send: (notification) => this.adminizer.sendNotification(notification),
            },
            apps: {
                list: () => this.getInstalledApps().map((name) => this.getRuntimeApp(name)!),
                get: (name) => this.getRuntimeApp(name),
                enable: (name) => this.enable(name),
                disable: (name) => this.disable(name),
                unregister: (name) => this.unregister(name),
            },
        };
    }

    private getRuntimeApp(name: string) {
        const installed = this.installedApps.get(name);
        if (!installed) {
            return undefined;
        }

        return {
            name,
            version: installed.app.version,
            state: installed.state,
        };
    }

    private async disposeResources(installed: InstalledApp): Promise<void> {
        for (const dispose of [...installed.disposers].reverse()) {
            await dispose();
        }
        installed.disposers = [];
    }
}
