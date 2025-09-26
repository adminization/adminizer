import {Adminizer} from "../../lib/Adminizer";

export class AIAssistantController {
    private static ensureEnabled(req: ReqType, res: ResType): boolean {
        if (!req.adminizer.config.aiAssistant?.enabled) {
            res.status(404).json({error: 'AI assistant is disabled'});
            return false;
        }

        if (!req.adminizer.aiAssistantHandler) {
            Adminizer.log.error('AI assistant handler is not initialized.');
            res.status(500).json({error: 'AI assistant is not available'});
            return false;
        }

        return true;
    }

    static listModels(req: ReqType, res: ResType) {
        if (!AIAssistantController.ensureEnabled(req, res)) {
            return;
        }

        const models = req.adminizer.aiAssistantHandler.getModels();
        res.json(models);
    }

    static async sendMessage(req: ReqType, res: ResType) {
        if (!AIAssistantController.ensureEnabled(req, res)) {
            return;
        }

        if (req.method.toUpperCase() !== 'POST') {
            res.status(405).json({error: 'Method Not Allowed'});
            return;
        }

        const {modelId, message, conversationId = null} = req.body ?? {};

        if (!modelId || typeof modelId !== 'string') {
            res.status(400).json({error: 'modelId is required'});
            return;
        }

        if (!message || typeof message !== 'string') {
            res.status(400).json({error: 'message is required'});
            return;
        }

        try {
            const conversation = await req.adminizer.aiAssistantHandler.sendMessage(
                modelId,
                message,
                conversationId,
                req.user?.id ?? null,
            );

            res.json({
                conversationId: conversation.id,
                modelId: conversation.modelId,
                messages: conversation.messages,
            });
        } catch (error) {
            Adminizer.log.error('AI assistant error', error);
            res.status(500).json({error: 'Unable to process AI assistant request'});
        }
    }
}
