import {Adminizer} from "../Adminizer";
import {AiChatMessage, AiModelMetadata, AiModelResponse, AiModelResponseContext} from "../../interfaces/ai";

export abstract class AbstractAiModel {
    protected constructor(protected readonly adminizer: Adminizer) {}

    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly description?: string;

    abstract generateResponse(
        prompt: string,
        context: AiModelResponseContext
    ): Promise<AiModelResponse>;

    get metadata(): AiModelMetadata {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
        };
    }

    protected cloneConversation(conversation: AiChatMessage[]): AiChatMessage[] {
        return conversation.map(message => ({...message}));
    }
}
