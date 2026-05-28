import type {Adminizer} from "../Adminizer";
import type {AppController, AppControllerMethod, AppControllerPolicy} from "./AdminizerApp";
import {bindWithMiddlewares} from "../../system/routePolicies";
import {
    requireAdmin,
    requireAnyPermission,
    requireAuthAPI,
    requireAuthEnabled,
    requireAuthUI,
    requirePermission,
} from "../../policies/authPolicies";

interface ControllerRecord {
    id: string;
    appName: string;
    method: AppControllerMethod;
    path: string;
    enabled: boolean;
}

export class ControllerHandler {
    private controllers = new Map<string, ControllerRecord>();

    constructor(private adminizer: Adminizer) {}

    register(appName: string, controller: AppController): string {
        const id = this.getControllerId(appName, controller);
        if (this.controllers.has(id)) {
            throw new Error(`Controller "${id}" is already registered`);
        }

        const fullPath = this.resolveRoute(controller.route);
        const record: ControllerRecord = {
            id,
            appName,
            method: controller.method,
            path: fullPath,
            enabled: true,
        };

        const middleware = bindWithMiddlewares(
            this.adminizer,
            this.adminizer.config.middlewares ?? [],
            (req, res, next) => {
                if (!record.enabled) {
                    return next();
                }

                return controller.middleware(req, res, next);
            },
            this.resolvePolicies(controller.policies)
        );

        this.bindRoute(controller.method, fullPath, middleware);
        this.controllers.set(id, record);
        this.adminizer.emitter.emit("app:controller:registered", {
            appName,
            resourceId: id,
            route: fullPath,
            method: controller.method,
            policies: controller.policies ?? [],
        });

        return fullPath;
    }

    disable(id: string): void {
        const record = this.controllers.get(id);
        if (!record) {
            return;
        }

        record.enabled = false;
        this.adminizer.emitter.emit("app:controller:disabled", {
            appName: record.appName,
            resourceId: id,
            route: record.path,
            method: record.method,
        });
    }

    enable(id: string): void {
        const record = this.controllers.get(id);
        if (!record) {
            return;
        }

        record.enabled = true;
        this.adminizer.emitter.emit("app:controller:enabled", {
            appName: record.appName,
            resourceId: id,
            route: record.path,
            method: record.method,
        });
    }

    unregister(id: string): void {
        const record = this.controllers.get(id);
        if (!record) {
            return;
        }

        this.removeRoute(record.path, record.method);
        this.controllers.delete(id);
        this.adminizer.emitter.emit("app:controller:unregistered", {
            appName: record.appName,
            resourceId: id,
            route: record.path,
            method: record.method,
        });
    }

    getByApp(appName: string): ControllerRecord[] {
        return Array.from(this.controllers.values()).filter((record) => record.appName === appName);
    }

    private getControllerId(appName: string, controller: AppController): string {
        return `${appName}:${controller.id ?? `${controller.method}:${controller.route}`}`;
    }

    private resolveRoute(route: string): string {
        const routePrefix = this.adminizer.config.routePrefix.replace(/\/+$/, "");
        const routePath = route.startsWith("/") ? route : `/${route}`;
        return `${routePrefix}${routePath}`;
    }

    private resolvePolicies(policies: AppControllerPolicy[] = []): MiddlewareType[] {
        return policies.map((policy) => {
            switch (policy.type) {
                case "auth":
                    return policy.mode === "api" ? requireAuthAPI() : requireAuthUI();
                case "auth-enabled":
                    return requireAuthEnabled();
                case "admin":
                    return requireAdmin({mode: policy.mode});
                case "permission":
                    return requirePermission(policy.token, {mode: policy.mode});
                case "any-permission":
                    return requireAnyPermission(policy.tokens, {mode: policy.mode});
            }
        });
    }

    private bindRoute(method: AppControllerMethod, route: string, middleware: MiddlewareType[]): void {
        switch (method) {
            case "get":
                this.adminizer.app.get(route, middleware);
                break;
            case "post":
                this.adminizer.app.post(route, middleware);
                break;
            case "put":
                this.adminizer.app.put(route, middleware);
                break;
            case "patch":
                this.adminizer.app.patch(route, middleware);
                break;
            case "delete":
                this.adminizer.app.delete(route, middleware);
                break;
            case "all":
                this.adminizer.app.all(route, middleware);
                break;
        }
    }

    private removeRoute(path: string, method: AppControllerMethod): void {
        const app = this.adminizer.app as any;
        const router = app.router ?? app._router;
        if (!Array.isArray(router?.stack)) {
            return;
        }

        const index = router.stack.findIndex((layer: any) =>
            layer.route?.path === path && layer.route?.methods?.[method]
        );

        if (index !== -1) {
            router.stack.splice(index, 1);
        }
    }
}
