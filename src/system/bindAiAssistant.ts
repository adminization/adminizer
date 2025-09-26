import {Adminizer} from "../lib/Adminizer";
import {AIAssistantHandler} from "../lib/ai/AIAssistantHandler";
import {DummyAIModel} from "../lib/ai/models/DummyAIModel";

export function bindAiAssistant(adminizer: Adminizer): void {
    adminizer.aiAssistantHandler = new AIAssistantHandler(adminizer);

    const dummyModel = new DummyAIModel(adminizer);
    adminizer.aiAssistantHandler.registerModel(dummyModel);

    Adminizer.log.info('AI assistant initialized with dummy model.');
}
