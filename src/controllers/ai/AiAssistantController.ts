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

        const models = (await Promise.all(handler.getModels().map(async (model) => ({
            model,
            allowed: await req.adminizer.accessRightsHelper.checkPermission(`ai-assistant-${model.id}`, req.user),
        })))).filter(({allowed}) => allowed).map(({model}) => model);

        return res.json(models);
    }
}
