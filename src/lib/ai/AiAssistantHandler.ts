import {v4 as uuid} from "uuid";
import {Adminizer} from "../Adminizer";
import {AbstractAiModel, AiGenerationContext} from "./AbstractAiModel";
import {AiConversation, AiMessage, AiModelSummary} from "./types";
import {UserAP} from "../../models/UserAP";

export interface ProcessMessageOptions {
    modelId?: string;
    message: string;
    conversationId?: string;
    user: UserAP;
}

export interface ProcessMessageResult {
    conversationId: string;
    modelId: string;
    messages: AiMessage[];
}

export class AiAssistantHandler {
    private readonly models = new Map<string, AbstractAiModel>();
    private readonly conversations = new Map<number, Map<string, AiConversation>>();
    private defaultModelId?: string;

    constructor(private readonly adminizer: Adminizer) {}

    registerModel(model: AbstractAiModel): void {
        this.models.set(model.id, model);
        if (!this.defaultModelId) {
            this.defaultModelId = model.id;
        }
    }

    setDefaultModel(modelId: string | undefined): void {
        if (!modelId) {
            return;
        }
        if (!this.models.has(modelId)) {
            Adminizer.log.warn(`Attempted to set unknown AI model as default: ${modelId}`);
            return;
        }
        this.defaultModelId = modelId;
    }

    getDefaultModelId(): string | undefined {
        return this.defaultModelId;
    }

    listModels(): AiModelSummary[] {
        return Array.from(this.models.values()).map((model) => ({
            id: model.id,
            name: model.name,
            description: model.description,
        }));
    }

    private getModel(modelId?: string): AbstractAiModel {
        const effectiveModelId = modelId ?? this.defaultModelId;
        if (!effectiveModelId) {
            throw new Error("AI assistant has no registered models");
        }
        const model = this.models.get(effectiveModelId);
        if (!model) {
            throw new Error(`AI model not found: ${effectiveModelId}`);
        }
        return model;
    }

    private getUserConversations(userId: number): Map<string, AiConversation> {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, new Map());
        }
        return this.conversations.get(userId)!;
    }

    private getOrCreateConversation(user: UserAP, modelId: string, conversationId?: string): AiConversation {
        const userConversations = this.getUserConversations(user.id);
        if (conversationId) {
            const existing = userConversations.get(conversationId);
            if (existing) {
                return existing;
            }
        }
        const newConversation: AiConversation = {
            id: conversationId ?? uuid(),
            userId: user.id,
            modelId,
            messages: [],
            updatedAt: new Date(),
        };
        userConversations.set(newConversation.id, newConversation);
        return newConversation;
    }

    private appendMessage(conversation: AiConversation, message: AiMessage): void {
        conversation.messages.push(message);
        conversation.updatedAt = new Date();
    }

    async processMessage(options: ProcessMessageOptions): Promise<ProcessMessageResult> {
        const {message, modelId: requestedModelId, conversationId, user} = options;
        if (!message || !message.trim()) {
            throw new Error("Message text is required");
        }

        const model = this.getModel(requestedModelId);
        const conversation = this.getOrCreateConversation(user, model.id, conversationId);

        if (conversation.modelId !== model.id) {
            conversation.modelId = model.id;
            conversation.messages = [];
        }

        const userMessage: AiMessage = {
            id: uuid(),
            role: 'user',
            content: message,
            createdAt: new Date(),
        };

        this.appendMessage(conversation, userMessage);

        const context: AiGenerationContext = {
            conversation,
            adminizer: this.adminizer,
        };

        const assistantMessage = await model.generateReply(message, context);
        this.appendMessage(conversation, assistantMessage);

        return {
            conversationId: conversation.id,
            modelId: conversation.modelId,
            messages: conversation.messages,
        };
    }
}
