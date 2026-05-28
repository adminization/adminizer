import type {AdminpanelConfig} from "../../interfaces/adminpanelConfig";

export type AppDisposer = () => void | Promise<void>;
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

export interface AppSetupContext {
    asset(asset: AppAsset): string;
    controller(controller: AppController): string;
    config(config: AppConfigPatch, id?: string): void;
}

export abstract class AbstractAdminizerApp<TConfig = unknown> {
    abstract readonly name: string;
    abstract readonly version: string;

    readonly config?: TConfig

    protected constructor() {}

    abstract setup(ctx: AppSetupContext): void | Promise<void>;

}
