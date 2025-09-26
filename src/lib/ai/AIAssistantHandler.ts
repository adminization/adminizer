import {v4 as uuid} from 'uuid';
import {Adminizer} from "../Adminizer";
import {AbstractAIModel} from "./AbstractAIModel";
import {AIAssistantConversation, AIAssistantMessage, AIAssistantModelSummary} from "../../interfaces/ai";

export class AIAssistantHandler {
    private readonly models: Map<string, AbstractAIModel> = new Map();
    private readonly conversations: Map<string, AIAssistantConversation> = new Map();

    constructor(private readonly adminizer: Adminizer) {}

    registerModel(model: AbstractAIModel): void {
        if (this.models.has(model.id)) {
            Adminizer.log.warn(`AI assistant model with id \`${model.id}\` already registered. Overwriting.`);
        }

        this.models.set(model.id, model);
    }

    getModels(): AIAssistantModelSummary[] {
        return Array.from(this.models.values()).map(model => ({
            id: model.id,
            label: model.label,
            description: model.description,
        }));
    }

    async sendMessage(
        modelId: string,
        prompt: string,
        conversationId: string | null,
        userId: number | null,
    ): Promise<AIAssistantConversation> {
        const model = this.models.get(modelId);

        if (!model) {
            throw new Error(`AI assistant model \`${modelId}\` is not registered.`);
        }

        let conversation: AIAssistantConversation | undefined;

        if (conversationId) {
            conversation = this.conversations.get(conversationId);

            if (conversation && conversation.userId !== userId) {
                conversation = undefined;
            }
        }

        if (!conversation) {
            conversation = {
                id: uuid(),
                modelId,
                userId,
                messages: [],
            };
            this.conversations.set(conversation.id, conversation);
        } else if (conversation.modelId !== modelId) {
            conversation.modelId = modelId;
            conversation.messages = [];
        }

        const userMessage: AIAssistantMessage = {
            id: uuid(),
            role: 'user',
            content: prompt,
            createdAt: new Date().toISOString(),
        };

        conversation.messages.push(userMessage);

        const response = await model.generateResponse(prompt, conversation);

        const assistantMessage: AIAssistantMessage = {
            id: uuid(),
            role: 'assistant',
            content: response,
            createdAt: new Date().toISOString(),
        };

        conversation.messages.push(assistantMessage);
        this.conversations.set(conversation.id, conversation);

        return conversation;
    }
}
