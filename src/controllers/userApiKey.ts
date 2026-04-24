import { ControllerHelper } from "../helpers/controllerHelper";
import { generateUserApiKey } from "../helpers/apiKeyHelper";
import { Adminizer } from "../lib/Adminizer";

/**
 * Controller for managing user API key.
 * GET /adminizer/api/user-key — returns current user's API key
 * POST /adminizer/api/user-key/regenerate — regenerates the API key
 */

export async function getUserApiKey(req: ReqType, res: ResType) {
    if (!req.adminizer.config.auth.enable) {
        return res.status(403).json({ error: 'Auth is disabled' });
    }

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // If user doesn't have an API key yet, generate one
    if (!req.user.apiKey) {
        const newKey = generateUserApiKey();
        try {
            const userModel = req.adminizer.modelHandler.model.get("UserAP");
            await userModel["_updateOne"]({ id: req.user.id }, { apiKey: newKey });
            req.user.apiKey = newKey;
        } catch (e) {
            Adminizer.log.error('Error generating user API key:', e);
            return res.status(500).json({ error: 'Failed to generate API key' });
        }
    }

    return res.json({ apiKey: req.user.apiKey });
}

export async function regenerateUserApiKey(req: ReqType, res: ResType) {
    if (!req.adminizer.config.auth.enable) {
        return res.status(403).json({ error: 'Auth is disabled' });
    }

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const newKey = generateUserApiKey();

    try {
        const userModel = req.adminizer.modelHandler.model.get("UserAP");
        await userModel["_updateOne"]({ id: req.user.id }, { apiKey: newKey });
        Adminizer.log.debug(`User ${req.user.id} regenerated their API key`);
        return res.json({ apiKey: newKey });
    } catch (e) {
        Adminizer.log.error('Error regenerating user API key:', e);
        return res.status(500).json({ error: 'Failed to regenerate API key' });
    }
}
