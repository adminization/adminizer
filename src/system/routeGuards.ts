import { Adminizer } from "../lib/Adminizer";

function composeGuards(action: MiddlewareType, guards: MiddlewareType[]): MiddlewareType {
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

export function bindWithPolicies(
    adminizer: Adminizer,
    policies: MiddlewareType[],
    action: MiddlewareType,
    guards: MiddlewareType[] = []
): MiddlewareType[] {
    if (!guards.length) {
        return adminizer.policyManager.bindPolicies(policies, action);
    }

    return adminizer.policyManager.bindPolicies(policies, composeGuards(action, guards));
}
