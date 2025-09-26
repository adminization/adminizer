import {Adminizer} from "../lib/Adminizer";
import {AiAssistantHandler} from "../lib/ai/AiAssistantHandler";
import {DummyAiModel} from "../lib/ai/models/DummyAiModel";

export async function bindAiAssistant(adminizer: Adminizer): Promise<void> {
    adminizer.aiAssistantHandler = new AiAssistantHandler(adminizer);

    const dummy = new DummyAiModel(adminizer);
    adminizer.aiAssistantHandler.registerModel(dummy);

    Adminizer.log.info('AI assistant initialized with dummy model.');
}
