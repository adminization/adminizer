import {Adminizer} from "../Adminizer";
import {AIAssistantConversation} from "../../interfaces/ai";

export abstract class AbstractAIModel {
    protected readonly adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer;
    }

    abstract readonly id: string;
    abstract readonly label: string;
    abstract readonly description?: string;

    abstract generateResponse(
        prompt: string,
        conversation: AIAssistantConversation
    ): Promise<string>;
}
