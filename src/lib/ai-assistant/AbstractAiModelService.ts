import {Adminizer} from '../Adminizer';
import {AiAssistantMessage, AiAssistantModelInfo} from '../../interfaces/types';
import {UserAP} from '../../models/UserAP';

/**
 * Base class for AI assistant models. It is responsible for registering
 * access rights for the model and providing metadata for the front-end.
 */
export abstract class AbstractAiModelService {
    protected readonly adminizer: Adminizer;
    public readonly id: string;
    public readonly name: string;
    public readonly description?: string;

    protected constructor(adminizer: Adminizer, metadata: AiAssistantModelInfo) {
        this.adminizer = adminizer;
        this.id = metadata.id;
        this.name = metadata.name;
        this.description = metadata.description;
        this.registerAccessRight();
    }

    protected registerAccessRight(): void {
        this.adminizer.accessRightsHelper.registerToken({
            id: `ai-assistant-${this.id}`,
            name: this.name,
            description: `Access to AI assistant model ${this.name}`,
            department: 'AI Assistant',
        });
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
        user: UserAP,
    ): Promise<string>;
}
