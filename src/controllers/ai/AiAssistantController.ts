import {Adminizer} from '../../lib/Adminizer';

export class AiAssistantController {
    static async getModels(req: ReqType, res: ResType) {
        if (!req.adminizer.config.aiAssistant?.enabled) {
            return res.json([]);
        }

        const handler = req.adminizer.aiAssistantHandler;
        if (!handler) {
            Adminizer.log.warn('AI assistant handler is not initialized');
            return res.json([]);
        }

        const models = handler
            .getModels()
            .filter((model) =>
                req.adminizer.accessRightsHelper.hasPermission(`ai-assistant-${model.id}`, req.user),
            );

        return res.json(models);
    }
}
