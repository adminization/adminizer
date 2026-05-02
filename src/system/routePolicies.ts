import { Adminizer } from "../lib/Adminizer";

function composePolicies(action: MiddlewareType, guards: MiddlewareType[]): MiddlewareType {
    return async (req, res, next) => {
        try {
            for (const guard of guards) {
                let shouldContinue = false;

                const guardNext = ((error?: unknown) => {
                    if (error) {
                        throw error;
                    }
                    shouldContinue = true;
                }) as any;

                await Promise.resolve(guard(req, res, guardNext));

                if (!shouldContinue || res.headersSent) {
                    return;
                }
            }

            return action(req, res, next);
        } catch (error) {
            return next(error as any);
        }
    };
}

export function bindWithMiddlewares(
    adminizer: Adminizer,
    middlewares: MiddlewareType[],
    action: MiddlewareType,
    policies: MiddlewareType[] = []
): MiddlewareType[] {
    if (!policies.length) {
        return adminizer.middlewareManager.bindMiddlewares(middlewares, action);
    }

    return adminizer.middlewareManager.bindMiddlewares(middlewares, composePolicies(action, policies));
}
