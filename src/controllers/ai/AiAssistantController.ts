import {AiAssistantHandler} from "../../lib/ai/AiAssistantHandler";
import {Adminizer} from "../../lib/Adminizer";

export class AiAssistantController {
    static async models(req: ReqType, res: ResType): Promise<void> {
        if (!AiAssistantController.ensureEnabled(req, res)) {
            return;
        }

        const handler = req.adminizer.aiAssistantHandler as AiAssistantHandler;
        res.json(handler.getModels());
    }

    static async conversation(req: ReqType, res: ResType): Promise<void> {
        if (!AiAssistantController.ensureEnabled(req, res)) {
            return;
        }

        const {model} = req.query as {model?: string};
        if (!model) {
            res.status(400).json({error: 'Model id is required'});
            return;
        }

        const handler = req.adminizer.aiAssistantHandler as AiAssistantHandler;
        const conversation = handler.getConversation(req.user, model);
        res.json(conversation);
    }

    static async chat(req: ReqType, res: ResType): Promise<void> {
        if (!AiAssistantController.ensureEnabled(req, res)) {
            return;
        }

        if (req.method.toUpperCase() !== 'POST') {
            res.status(405).json({error: 'Method Not Allowed'});
            return;
        }

        const {modelId, message} = req.body as {modelId?: string; message?: string};

        if (!modelId || !message) {
            res.status(400).json({error: 'Model id and message are required'});
            return;
        }

        try {
            const handler = req.adminizer.aiAssistantHandler as AiAssistantHandler;
            const conversation = await handler.sendMessage(req.user, modelId, message);
            res.json({conversation});
        } catch (error) {
            Adminizer.log.error('AI assistant chat error:', error);
            res.status(500).json({error: 'AI assistant is unavailable at the moment'});
        }
    }

    private static ensureEnabled(req: ReqType, res: ResType): boolean {
        if (!req.adminizer.config.aiAssistant?.enabled || !req.adminizer.aiAssistantHandler) {
            res.status(404).json({error: 'Not Found'});
            return false;
        }
        return true;
    }
}
