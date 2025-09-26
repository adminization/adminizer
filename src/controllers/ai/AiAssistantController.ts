import {Adminizer} from '../../lib/Adminizer';
import {AiAssistantMessage} from '../../interfaces/types';

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

    static async getHistory(req: ReqType, res: ResType) {
        if (!req.adminizer.config.aiAssistant?.enabled) {
            return res.json({history: []});
        }

        const {modelId} = req.params;
        if (!modelId) {
            return res.status(400).json({error: 'Model id is required'});
        }

        if (!req.adminizer.accessRightsHelper.hasPermission(`ai-assistant-${modelId}`, req.user)) {
            return res.status(403).json({error: 'Forbidden'});
        }

        const handler = req.adminizer.aiAssistantHandler;
        if (!handler) {
            return res.status(500).json({error: 'AI assistant is not available'});
        }

        const history = handler.getHistory(req.user.id, modelId).map(AiAssistantController.serializeMessage);
        return res.json({history});
    }

    static async sendMessage(req: ReqType, res: ResType) {
        if (!req.adminizer.config.aiAssistant?.enabled) {
            return res.status(503).json({error: 'AI assistant is disabled'});
        }

        const {modelId, message} = req.body as {modelId?: string; message?: string};

        if (!modelId || typeof modelId !== 'string') {
            return res.status(400).json({error: 'Model id is required'});
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({error: 'Message is required'});
        }

        if (!req.adminizer.accessRightsHelper.hasPermission(`ai-assistant-${modelId}`, req.user)) {
            return res.status(403).json({error: 'Forbidden'});
        }

        const handler = req.adminizer.aiAssistantHandler;
        if (!handler) {
            return res.status(500).json({error: 'AI assistant is not available'});
        }

        try {
            const response = await handler.sendMessage(req.user, modelId, message.trim());
            return res.json({
                modelId,
                history: response.history.map(AiAssistantController.serializeMessage),
            });
        } catch (error) {
            Adminizer.log.error('AI assistant error', error);
            return res.status(500).json({error: 'Failed to process request'});
        }
    }

    static async resetHistory(req: ReqType, res: ResType) {
        if (!req.adminizer.config.aiAssistant?.enabled) {
            return res.status(503).json({error: 'AI assistant is disabled'});
        }

        const {modelId} = req.params;
        if (!modelId) {
            return res.status(400).json({error: 'Model id is required'});
        }

        if (!req.adminizer.accessRightsHelper.hasPermission(`ai-assistant-${modelId}`, req.user)) {
            return res.status(403).json({error: 'Forbidden'});
        }

        const handler = req.adminizer.aiAssistantHandler;
        if (!handler) {
            return res.status(500).json({error: 'AI assistant is not available'});
        }

        handler.resetHistory(req.user.id, modelId);
        return res.json({history: []});
    }

    private static serializeMessage(message: AiAssistantMessage) {
        return {
            id: message.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp,
            modelId: message.modelId,
        };
    }
}
