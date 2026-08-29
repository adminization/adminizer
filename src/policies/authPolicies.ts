import { redirectToLogin } from "../helpers/inertiaAutHelper";

export type PermissionResolver = string | ((req: ReqType) => string | undefined);
export type GuardMode = "ui" | "api";

type GuardOptions = {
    mode?: GuardMode;
};

function unauthorized(req: ReqType, res: ResType, mode: GuardMode): void {
    if (mode === "ui") {
        redirectToLogin(req, res);
        return;
    }

    res.status(401).json({ error: req.i18n?.__("Unauthorized") || "Unauthorized" });
}

function forbidden(req: ReqType, res: ResType, mode: GuardMode): void {
    if (mode === "ui") {
        res.sendStatus(403);
        return;
    }

    res.status(403).json({ error: req.i18n?.__("Forbidden") || "Forbidden" });
}

function resolveToken(token: PermissionResolver, req: ReqType): string | undefined {
    if (typeof token === "function") {
        return token(req);
    }
    return token;
}

export function requireAuthEnabled(): MiddlewareType {
    return async (req, res, next) => {
        if (!req.adminizer.config.auth.enable) {
            return res.status(403).json({ error: "Auth is disabled" });
        }
        return next();
    };
}

export function requireAuthUI(): MiddlewareType {
    return async (req, res, next) => {
        if (req.adminizer.config.auth.enable && !req.user) {
            unauthorized(req, res, "ui");
            return;
        }
        return next();
    };
}

export function requireAuthAPI(): MiddlewareType {
    return (req, res, next) => {
        if (req.adminizer.config.auth.enable && !req.user) {
            unauthorized(req, res, "api");
            return;
        }
        return next();
    };
}

export function requireAdmin(options: GuardOptions = {}): MiddlewareType {
    const mode = options.mode || "api";

    return (req, res, next) => {
        if (!req.adminizer.config.auth.enable) {
            return next();
        }

        if (!req.user) {
            unauthorized(req, res, mode);
            return;
        }

        if (!req.user.isAdministrator) {
            forbidden(req, res, mode);
            return;
        }

        return next();
    };
}

export function requirePermission(
    token: PermissionResolver,
    options: GuardOptions = {}
): MiddlewareType {
    const mode = options.mode || "api";

    return async (req, res, next) => {
        if (!req.adminizer.config.auth.enable) {
            return next();
        }

        if (!req.user) {
            unauthorized(req, res, mode);
            return;
        }

        const tokenId = resolveToken(token, req);      
          
        const hasPermission = await req.adminizer.accessRightsHelper.checkPermission(tokenId, req.user);
        
        if (!hasPermission) {
            forbidden(req, res, mode);
            return;
        }

        return next();
    };
}

export function requireAnyPermission(
    tokens: PermissionResolver[],
    options: GuardOptions = {}
): MiddlewareType {
    const mode = options.mode || "api";

    return async (req, res, next) => {
        if (!req.adminizer.config.auth.enable) {
            return next();
        }

        if (!req.user) {
            unauthorized(req, res, mode);
            return;
        }

        const tokenIds = tokens
            .map((token) => resolveToken(token, req))
            .filter((token): token is string => Boolean(token));

        const hasPermission = await req.adminizer.accessRightsHelper.checkAnyPermission(tokenIds, req.user);
        if (!hasPermission) {
            forbidden(req, res, mode);
            return;
        }

        return next();
    };
}
