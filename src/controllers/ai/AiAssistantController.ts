export class AiAssistantController {
    private static ensureEnabled(req: ReqType, res: ResType): boolean {
        if (!req.adminizer.config.aiAssistant?.enabled || !req.adminizer.aiAssistantHandler) {
            res.status(404).json({error: 'AI assistant is disabled'});
            return false;
        }
        return true;
    }

    static listModels(req: ReqType, res: ResType) {
        if (!AiAssistantController.ensureEnabled(req, res)) {
            return;
        }
        const handler = req.adminizer.aiAssistantHandler!;
        res.json({
            models: handler.listModels(),
            defaultModel: handler.getDefaultModelId(),
        });
    }

    static async chat(req: ReqType, res: ResType) {
        if (!AiAssistantController.ensureEnabled(req, res)) {
            return;
        }

        if (req.method.toUpperCase() !== 'POST') {
            res.status(405).json({error: 'Method not allowed'});
            return;
        }

        const {message, modelId, conversationId} = req.body ?? {};
        const handler = req.adminizer.aiAssistantHandler!;

        try {
            const result = await handler.processMessage({
                message,
                modelId,
                conversationId,
                user: req.user,
            });

            res.json({
                conversationId: result.conversationId,
                modelId: result.modelId,
                messages: result.messages.map(item => ({
                    id: item.id,
                    role: item.role,
                    content: item.content,
                    createdAt: item.createdAt.toISOString(),
                })),
            });
        } catch (error) {
            const messageText = error instanceof Error ? error.message : 'Unable to process AI request';
            res.status(400).json({error: messageText});
        }
    }
}
