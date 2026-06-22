import {AbstractAiModelService} from "../../../dist/lib/ai-assistant/AbstractAiModelService";
import type {AiAssistantMessage} from "../../../dist/interfaces/types";
import type {User} from "../../../dist/models/User";

export class DummyAiModelService extends AbstractAiModelService {
    constructor() {
        super({
            id: "dummy",
            name: "Dummy assistant",
            description: "Returns a simple echo response for local testing.",
        });
    }

    async generateReply(
        _prompt: string,
        _history: AiAssistantMessage[],
        user: User,
    ): Promise<string> {
        return `Hello ${user.login}, this is a dummy AI response.`;
    }
}
