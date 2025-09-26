import {v4 as uuid} from "uuid";
import {Adminizer} from "../Adminizer";
import {AbstractAiModel} from "./AbstractAiModel";
import {AiChatMessage, AiModelMetadata} from "../../interfaces/ai";
import {UserAP} from "../../models/UserAP";

export class AiAssistantHandler {
    private readonly models = new Map<string, AbstractAiModel>();
    private readonly conversations = new Map<string, AiChatMessage[]>();

    constructor(private readonly adminizer: Adminizer) {}

    registerModel(model: AbstractAiModel): void {
        if (this.models.has(model.id)) {
            throw new Error(`AI model with id "${model.id}" is already registered.`);
        }
        this.models.set(model.id, model);
        Adminizer.log.info(`AI assistant model registered: ${model.id}`);
    }

    getModels(): AiModelMetadata[] {
        return Array.from(this.models.values()).map(model => model.metadata);
    }

    getModel(modelId: string): AbstractAiModel | undefined {
        return this.models.get(modelId);
    }

    getConversation(user: UserAP, modelId: string): AiChatMessage[] {
        return this.conversations.get(this.getConversationKey(user.id, modelId)) ?? [];
    }

    clearConversation(user: UserAP, modelId: string): void {
        this.conversations.delete(this.getConversationKey(user.id, modelId));
    }

    async sendMessage(user: UserAP, modelId: string, content: string): Promise<AiChatMessage[]> {
        const model = this.getModel(modelId);
        if (!model) {
            throw new Error(`AI model not found: ${modelId}`);
        }

        const key = this.getConversationKey(user.id, modelId);
        const existingConversation = this.getConversation(user, modelId);
        const userMessage: AiChatMessage = {
            id: uuid(),
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
        };

        const conversationWithUser = [...existingConversation, userMessage];
        const response = await model.generateResponse(content, {
            user,
            modelId,
            conversation: conversationWithUser,
        });

        const assistantMessage: AiChatMessage = {
            id: uuid(),
            role: 'assistant',
            content: response.content,
            timestamp: new Date().toISOString(),
        };

        const updatedConversation = [...conversationWithUser, assistantMessage];
        this.conversations.set(key, updatedConversation);
        return updatedConversation;
    }

    private getConversationKey(userId: number, modelId: string): string {
        return `${userId}:${modelId}`;
    }
}
