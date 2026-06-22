import {AiAssistantMessage, AiAssistantModelInfo} from '../../interfaces/types';
import {User} from '../../models/User';

/**
 * Base class for AI assistant models. App modules register access rights
 * and expose model metadata through this service.
 */
export abstract class AbstractAiModelService {
    public readonly id: string;
    public readonly name: string;
    public readonly description?: string;

    protected constructor(metadata: AiAssistantModelInfo) {
        this.id = metadata.id;
        this.name = metadata.name;
        this.description = metadata.description;
    }

    public getMetadata(): AiAssistantModelInfo {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
        };
    }

    public abstract generateReply(
        prompt: string,
        history: AiAssistantMessage[],
        user: User,
    ): Promise<string>;
}
