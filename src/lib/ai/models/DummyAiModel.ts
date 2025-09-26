import {AbstractAiModel, AiGenerationContext} from "../AbstractAiModel";
import {AiMessage} from "../types";
import {v4 as uuid} from "uuid";

export class DummyAiModel extends AbstractAiModel {
    public readonly id = "dummy";
    public readonly name = "AI Assistant Dummy";

    constructor() {
        super("Placeholder model used during development");
    }

    async generateReply(_prompt: string, _context: AiGenerationContext): Promise<AiMessage> {
        return {
            id: uuid(),
            role: 'assistant',
            content: 'Ai-assystant dummy in deveploment',
            createdAt: new Date(),
        };
    }
}
