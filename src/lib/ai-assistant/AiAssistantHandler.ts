import {v4 as uuid} from 'uuid';
import {Adminizer} from '../Adminizer';
import {AbstractAiModelService} from './AbstractAiModelService';
import {AiAssistantMessage, AiAssistantModelInfo} from '../../interfaces/types';
import {User} from '../../models/User';

export class AiAssistantHandler {
    private readonly models = new Map<string, AbstractAiModelService>();
    private readonly owners = new Map<string, string>();
    private readonly history = new Map<string, AiAssistantMessage[]>();

    constructor(private readonly adminizer: Adminizer) {}

    /**
     * @param owner App name when the model belongs to an app. Models without an
     * owner belong to the host application and are never removed automatically.
     */
    registerModel(service: AbstractAiModelService, owner?: string): void {
        if (this.models.has(service.id)) {
            Adminizer.log.warn(
                `AI assistant model with id "${service.id}" is already registered. Overwriting.`,
            );
        }
        this.models.set(service.id, service);

        if (owner) {
            this.owners.set(service.id, owner);
        } else {
            this.owners.delete(service.id);
        }
    }

    /**
     * @param owner When passed, the model is kept if it is owned by someone
     * else, so a disabled app never removes another owner's model.
     */
    unregisterModel(id: string, owner?: string): void {
        if (!this.models.has(id)) {
            return;
        }

        if (owner && this.owners.get(id) !== owner) {
            return;
        }

        this.models.delete(id);
        this.owners.delete(id);

        for (const key of this.history.keys()) {
            if (key.endsWith(`:${id}`)) {
                this.history.delete(key);
            }
        }
    }

    getModel(id: string): AbstractAiModelService | undefined {
        return this.models.get(id);
    }

    getModels(): AiAssistantModelInfo[] {
        return Array.from(this.models.values()).map((service) => service.getMetadata());
    }

    getHistory(userId: number, modelId: string): AiAssistantMessage[] {
        return this.history.get(this.getSessionKey(userId, modelId)) ?? [];
    }

    resetHistory(userId: number, modelId: string): void {
        this.history.delete(this.getSessionKey(userId, modelId));
    }

    async sendMessage(
        user: User,
        modelId: string,
        prompt: string,
    ): Promise<{history: AiAssistantMessage[]}> {
        const service = this.getModel(modelId);
        if (!service) {
            throw new Error(`AI assistant model not found: ${modelId}`);
        }

        const sessionKey = this.getSessionKey(user.id, modelId);
        const currentHistory = [...this.getHistory(user.id, modelId)];

        const userMessage: AiAssistantMessage = {
            id: uuid(),
            role: 'user',
            content: prompt,
            timestamp: new Date(),
            modelId,
        };
        currentHistory.push(userMessage);

        const reply = await service.generateReply(prompt, currentHistory, user);

        const assistantMessage: AiAssistantMessage = {
            id: uuid(),
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
            modelId,
        };

        currentHistory.push(assistantMessage);
        this.history.set(sessionKey, currentHistory);

        return {history: currentHistory};
    }

    private getSessionKey(userId: number, modelId: string): string {
        return `${userId}:${modelId}`;
    }
}
