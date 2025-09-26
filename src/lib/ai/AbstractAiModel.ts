import {Adminizer} from "../Adminizer";
import {AiConversation, AiMessage} from "./types";

export interface AiGenerationContext {
    conversation: AiConversation;
    adminizer: Adminizer;
}

export abstract class AbstractAiModel {
    public abstract readonly id: string;
    public abstract readonly name: string;
    public readonly description?: string;

    protected constructor(description?: string) {
        this.description = description;
    }

    abstract generateReply(prompt: string, context: AiGenerationContext): Promise<AiMessage>;
}
