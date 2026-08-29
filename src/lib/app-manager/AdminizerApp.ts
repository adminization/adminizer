import type {ActionType, AdminpanelConfig, AdminpanelIcon, ModelConfig} from "../../interfaces/adminpanelConfig";
import type {AccessRightsToken, INotification, ModelResource, PermissionContext} from "../../interfaces/types";
import type {AbstractCatalog} from "../catalog/AbstractCatalog";
import type {CatalogTemplateComponentResource} from "../catalog/CatalogTemplateComponentHandler";
import type {AppModelAccess} from "../model/ModelHandler";
import type {AbstractMediaManager} from "../media-manager/AbstractMediaManager";
import type {Config, ControlType} from "../controls/Control";
import type {User} from "../../models/User";
import type {DataAccessor} from "../DataAccessor";
import type {AbstractAiModelService} from "../ai-assistant/AbstractAiModelService";
import type {AiAssistantUiMethod} from '../ai-assistant/AiAssistantUiMethodHandler';
import type {AdminLink, AdminLinkTemplate} from '../admin-links/AdminLinkHandler';
import type {AiAssistantAgentSkill} from '../ai-assistant/AiAssistantAgentSkillHandler';

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

export interface AppControlResource {
    id?: string;
    type: ControlType;
    name: string;
    config?: Config;
    component: AppAsset;
    stylesheet?: AppAsset;
}

export interface AppWidgetBaseResource {
    id: string;
    name: string;
    description: string;
    icon?: AdminpanelIcon | string;
    department: string;
    backgroundCSS?: string | null;
    size?: {
        h: number;
        w: number;
    } | null;
    accessRightsToken?: string;
    group?: string;
}

export interface AppWidgetContext {
    runtime: AppRuntime;
}

export interface AppWidgetInfoContext extends AppWidgetContext {
    user?: ReqType["user"];
}

export interface AppInfoWidgetResource extends AppWidgetBaseResource {
    type: "info";
    link?: string;
    linkType?: "self" | "blank";
    getInfo(context: AppWidgetInfoContext): Promise<string> | string;
}

export interface AppActionWidgetResource extends AppWidgetBaseResource {
    type: "action";
    action(context: AppWidgetContext): Promise<unknown> | unknown;
}

export interface AppSwitchWidgetResource extends AppWidgetBaseResource {
    type: "switcher";
    getState(context: AppWidgetContext): Promise<boolean> | boolean;
    switchIt(context: AppWidgetContext): Promise<boolean> | boolean;
}

export interface AppLinkWidgetLink {
    name: string;
    description: string;
    icon?: AdminpanelIcon | string;
    link: string;
    linkType: "self" | "blank";
    backgroundCSS?: string | null;
}

export interface AppLinkWidgetResource extends AppWidgetBaseResource {
    type: "link";
    links: AppLinkWidgetLink[];
}

export interface AppCustomWidgetResource extends AppWidgetBaseResource {
    type: "custom";
    component: AppAsset;
}

export type AppWidgetResource =
    | AppInfoWidgetResource
    | AppActionWidgetResource
    | AppSwitchWidgetResource
    | AppLinkWidgetResource
    | AppCustomWidgetResource;

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
    accessRights: AppRuntimeAccessRights;
    notifications: AppRuntimeNotifications;
    apps: AppRuntimeApps;
}

export interface AppRuntimeAccessRights {
    /** The full decision, including a contextual token's own `check`. */
    checkPermission(token: string, user: User, context?: PermissionContext): Promise<boolean>;
    /**
     * @deprecated Use {@link AppRuntimeAccessRights.checkPermission}. Synchronous
     * and fail-closed: a contextual token is denied here, because there is no way
     * to run its asynchronous `check` without awaiting. Kept synchronous so that
     * apps written against it can never read a pending promise as "granted".
     */
    hasPermission(token: string, user: User): boolean;
    getPermissionRights(token: string, user: User): string[] | null;
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

export interface AppMediaManagerResource {
    factory: (runtime: AppRuntime) => AbstractMediaManager | Promise<AbstractMediaManager>;
}

export interface AppAiAssistantContext {
    runtime: AppRuntime;
    routePrefix: string;
    getModelResources(): ModelResource[];
    resolveModelResource(modelName: string): ModelResource | undefined;
    checkPermission(token: string, user: User): Promise<boolean>;
    /** @deprecated Use {@link AppAiAssistantContext.checkPermission}; this one fails closed on contextual tokens. */
    hasPermission(token: string, user: User): boolean;
    createDataAccessor(modelResource: ModelResource, user: User, action: ActionType): DataAccessor;
    /** UI tools available to this user, including methods registered by apps. */
    getUiMethods(user: User): Promise<AiAssistantUiMethod[]>;
}

export interface AppAiAssistantResource {
    models: Array<(context: AppAiAssistantContext) => AbstractAiModelService | Promise<AbstractAiModelService>>;
}

export interface AppAiAssistantUiMethodResource extends AiAssistantUiMethod {
    id: string;
}

export interface AppAiAssistantAgentSkillResource extends AiAssistantAgentSkill {}

/** Skills contributed by an app. UI methods are browser skills; agent skills run on the server. */
export interface AppSkills {
    uiMethod(method: AppAiAssistantUiMethodResource): void;
    agent(skill: AppAiAssistantAgentSkillResource): void;
}

export interface AppAdminLinkResource extends AdminLink {}

export interface AppAdminLinkTemplateResource extends AdminLinkTemplate {}

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
    control(control: AppControlResource): void;
    widget(widget: AppWidgetResource): void;
    controller(controller: AppController): string;
    config(config: AppConfigPatch, id?: string): void;
    accessRight(token: AccessRightsToken): void;
    catalog(catalog: AppCatalogFactoryResource): void;
    mediaManager(resource: AppMediaManagerResource): void;
    model(model: AppModelResource): void;
    modelAccess(access: AppModelAccessResource): void;
    aiAssistant(resource: AppAiAssistantResource): void;
    skills: AppSkills;
    /** Register a standalone server page in the admin navigation and agent search. */
    adminLink(link: AppAdminLinkResource): void;
    /** Register a parametrized page (e.g. `/admin/orders/:id/invoice`) the assistant may open. */
    adminLinkTemplate(template: AppAdminLinkTemplateResource): void;
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
