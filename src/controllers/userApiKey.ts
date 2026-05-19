import { generateUserApiKey } from "../helpers/apiKeyHelper";
import { Adminizer } from "../lib/Adminizer";

/**
 * Controller for managing user API key.
 * GET /adminizer/api/user-key — returns current user's API key
 * POST /adminizer/api/user-key/regenerate — regenerates the API key
 */

export async function getUserApiKey(req: ReqType, res: ResType) {
    // If user doesn't have an API key yet, generate one
    if (!req.user.apiKey) {
        const newKey = generateUserApiKey();
        try {
            const userModel = req.adminizer.modelHandler.internal("auth").get("UserAP");
            await userModel.updateOne({where: {id: req.user.id}}, { apiKey: newKey });
            req.user.apiKey = newKey;
        } catch (e) {
            Adminizer.log.error('Error generating user API key:', e);
            return res.status(500).json({ error: 'Failed to generate API key' });
        }
    }

    return res.json({ apiKey: req.user.apiKey });
}

export async function regenerateUserApiKey(req: ReqType, res: ResType) {
    const newKey = generateUserApiKey();

    try {
        const userModel = req.adminizer.modelHandler.internal("auth").get("UserAP");
        await userModel.updateOne({where: {id: req.user.id}}, { apiKey: newKey });
        Adminizer.log.debug(`User ${req.user.id} regenerated their API key`);
        return res.json({ apiKey: newKey });
    } catch (e) {
        Adminizer.log.error('Error regenerating user API key:', e);
        return res.status(500).json({ error: 'Failed to regenerate API key' });
    }
}
