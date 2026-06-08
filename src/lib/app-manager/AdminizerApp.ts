import type {AdminpanelConfig, ModelConfig} from "../../interfaces/adminpanelConfig";
import type {AccessRightsToken} from "../../interfaces/types";
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

export interface AppRuntime {
    models: AppModelAccess;
    config: AppRuntimeConfig;
}

export interface AppRuntimeConfig {
    readonly routePrefix: string;
    getModelConfig(modelName: string): ModelConfig | undefined;
}

export interface AppModelAccessResource {
    id?: string;
    models: string[];
}

export interface AppModelResource<T = any> {
    name: string;
    adapter?: string;
    schema: Record<string, any>;
    sync?: boolean;
}

export interface AppCatalogFactoryResource {
    id: string;
    factory: (runtime: AppRuntime) => AbstractCatalog | Promise<AbstractCatalog>;
}

export type AppCatalogResource = AbstractCatalog | AppCatalogFactoryResource;

export interface AppSetupContext {
    asset(asset: AppAsset): string;
    controller(controller: AppController): string;
    config(config: AppConfigPatch, id?: string): void;
    accessRight(token: AccessRightsToken): void;
    catalog(catalog: AppCatalogResource): void;
    catalogTemplateComponent(component: CatalogTemplateComponentResource): void;
    model<T = any>(model: AppModelResource<T>): void;
    modelAccess(access: AppModelAccessResource): void;
    listener(event: AppEventName, handler: AppEventHandler): void;
}

export abstract class AbstractAdminizerApp<TConfig = unknown> {
    abstract readonly name: string;
    abstract readonly version: string;

    readonly config?: TConfig

    protected constructor() {}

    abstract setup(ctx: AppSetupContext): void | Promise<void>;

}
