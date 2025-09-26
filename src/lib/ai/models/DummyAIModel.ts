import {AbstractAIModel} from "../AbstractAIModel";
import {AIAssistantConversation} from "../../../interfaces/ai";

export class DummyAIModel extends AbstractAIModel {
    readonly id = 'dummy';
    readonly label = 'Dummy assistant';
    readonly description = 'Returns a placeholder response for development environments.';

    async generateResponse(_: string, __: AIAssistantConversation): Promise<string> {
        return 'AI-assistant dummy in development';
    }
}
