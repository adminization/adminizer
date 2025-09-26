import {Adminizer} from '../lib/Adminizer';
import {AiAssistantHandler} from '../lib/ai-assistant/AiAssistantHandler';
import {DummyAiModelService} from '../lib/ai-assistant/DummyAiModelService';
import {AbstractAiModelService} from '../lib/ai-assistant/AbstractAiModelService';

const modelFactories: Record<string, (adminizer: Adminizer) => AbstractAiModelService> = {
    dummy: (adminizer) => new DummyAiModelService(adminizer),
};

export async function bindAiAssistant(adminizer: Adminizer): Promise<void> {
    adminizer.aiAssistantHandler = new AiAssistantHandler(adminizer);

    const configModels = adminizer.config.aiAssistant?.models;
    const requestedModels = Array.isArray(configModels) && configModels.length > 0
        ? configModels
        : ['dummy'];

    requestedModels.forEach((modelId) => {
        const factory = modelFactories[modelId];
        if (!factory) {
            Adminizer.log.warn(`AI assistant model "${modelId}" is not registered. Skipping.`);
            return;
        }

        const service = factory(adminizer);
        adminizer.aiAssistantHandler.registerModel(service);
    });

    Adminizer.log.info(
        `AI assistant initialized with models: ${adminizer.aiAssistantHandler.getModels().map((m) => m.id).join(', ')}`,
    );
}
