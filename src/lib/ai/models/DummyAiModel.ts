import {AbstractAiModel} from "../AbstractAiModel";
import {AiModelResponse, AiModelResponseContext} from "../../../interfaces/ai";
import {Adminizer} from "../../Adminizer";

export class DummyAiModel extends AbstractAiModel {
    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    readonly id = 'dummy-dev';
    readonly name = 'Dummy AI (development)';
    readonly description = 'Returns a placeholder response for development environments.';

    async generateResponse(_prompt: string, _context: AiModelResponseContext): Promise<AiModelResponse> {
        return {content: 'Ai-assystant dummy in deveploment'};
    }
}
