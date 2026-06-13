import type {AdminpanelConfig, ModelConfig} from "../../interfaces/adminpanelConfig";
import type {AccessRightsToken, INotification} from "../../interfaces/types";
import type {AbstractCatalog} from "../catalog/AbstractCatalog";
import type {CatalogTemplateComponentResource} from "../catalog/CatalogTemplateComponentHandler";
import type {AppModelAccess} from "../model/ModelHandler";

export type AppDisposer = () => void | Promise<void>;
export type AppEventName = string | symbol;
export type AppEventHandler<TPayload = any> = (payload: TPayload, runtime: AppRuntime) => void | Promise<void>;
export type AppControllerMethod = "get" | "post" | "put" | "patch" | "delete" | "all";
export type AppControllerPolicyMode = "ui" | "api";
export type AppControllerPolicy =
    | { type: "auth"; mode?: AppControllerPolicyMode }
    | { type: "auth-enabled" }
    | { type: "admin"; mode?: AppControllerPolicyMode }
    | { type: "permission"; token: string; mode?: AppControllerPolicyMode }
    | { type: "any-permission"; tokens: string[]; mode?: AppControllerPolicyMode };
export type AppConfigPatch = {
    [K in keyof AdminpanelConfig]?: AdminpanelConfig[K] extends (...args: any[]) => any
        ? AdminpanelConfig[K]
        : AdminpanelConfig[K] extends Array<infer U>
            ? U[]
            : AdminpanelConfig[K] extends object
                ? Partial<AdminpanelConfig[K]>
                : AdminpanelConfig[K];
};

/**
 * A controller owned by an Adminizer app.
 *
 * Before the middleware runs, ControllerHandler assigns an AppRuntime scoped
 * to the owning app to `req.runtime`. App controllers must use that runtime
 * instead of reading `req.adminizer`.
 */
export interface AppController {
    id?: string;
    route: string;
    method: AppControllerMethod;
    middleware: MiddlewareType;
    policies?: AppControllerPolicy[];
}

export interface AppAsset {
    id: string;
    filePath: string;
    route?: string;
    devUrl?: string;
}

/**
 * Public capabilities available to an Adminizer app at runtime.
 *
 * The runtime is scoped to the app that registered the resource. In
 * particular, `models` exposes only models declared through
 * `AppSetupContext.modelAccess()`.
 *
 * App code must not retain or depend on the Adminizer instance. Controllers
 * receive this object through `req.runtime`; catalog factories and event
 * listeners receive it as an argument.
 */
export interface AppRuntime {
    models: AppModelAccess;
    config: AppRuntimeConfig;
    notifications: AppRuntimeNotifications;
    apps: AppRuntimeApps;
}

export interface AppRuntimeConfig {
    readonly routePrefix: string;
    getModelConfig(modelName: string): ModelConfig | undefined;
}

export type AppRuntimeAppState = "registered" | "enabled" | "disabled" | "unregistered" | "failed";

export interface AppRuntimeApp {
    readonly name: string;
    readonly version: string;
    readonly state: AppRuntimeAppState;
}

export interface AppRuntimeApps {
    list(): AppRuntimeApp[];
    get(name: string): AppRuntimeApp | undefined;
    enable(name: string): Promise<void>;
    disable(name: string): Promise<void>;
    unregister(name: string): Promise<void>;
}

export interface AppRuntimeNotifications {
    send(notification: Omit<INotification, "id" | "createdAt" | "icon">): Promise<boolean>;
}

export interface AppModelAccessResource {
    id?: string;
    models: string[];
}

export interface AppModelResource {
    name: string;
    adapter?: string;
}

export interface AppCatalogFactoryResource {
    id: string;
    templates?: CatalogTemplateComponentResource[];
    factory: (runtime: AppRuntime) => AbstractCatalog | Promise<AbstractCatalog>;
}

/**
 * Resource registration API provided while an app is being enabled.
 *
 * Apps use this context to declare everything they own. They must not accept
 * an Adminizer instance in their constructor or setup method. This keeps app
 * lifecycle, resource cleanup, model permissions, and runtime capabilities
 * under AppManager control.
 */
export interface AppSetupContext {
    asset(asset: AppAsset): string;
    controller(controller: AppController): string;
    config(config: AppConfigPatch, id?: string): void;
    accessRight(token: AccessRightsToken): void;
    catalog(catalog: AppCatalogFactoryResource): void;
    model(model: AppModelResource): void;
    modelAccess(access: AppModelAccessResource): void;
    listener(event: AppEventName, handler: AppEventHandler): void;
}

/**
 * Base contract for an Adminizer app.
 *
 * An app is created from its own configuration and optional app-level
 * dependencies, then enabled with `adminizer.appManager.enable(app)`.
 * The Adminizer instance belongs to the host application and must not be
 * passed into or stored by the app.
 *
 * Use `setup(ctx)` for resource registration. At runtime, use:
 * - `req.runtime` in app controllers;
 * - the `runtime` factory argument in catalogs;
 * - the `runtime` handler argument in event listeners.
 */
export abstract class AbstractAdminizerApp<TConfig = unknown> {
    abstract readonly name: string;
    abstract readonly version: string;

    readonly config?: TConfig

    protected constructor() {}

    /**
     * Declares resources owned by the app.
     *
     * Do not add an Adminizer parameter. Runtime access is intentionally
     * provided through registered controller requests, factories, and
     * listeners.
     */
    abstract setup(ctx: AppSetupContext): void | Promise<void>;

}
