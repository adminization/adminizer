import {Adminizer} from "../lib/Adminizer";
import {AiAssistantHandler} from "../lib/ai/AiAssistantHandler";
import {DummyAiModel} from "../lib/ai/models/DummyAiModel";
import {AbstractAiModel} from "../lib/ai/AbstractAiModel";

export async function bindAiAssistant(adminizer: Adminizer): Promise<void> {
    adminizer.aiAssistantHandler = new AiAssistantHandler(adminizer);
    const config = adminizer.config.aiAssistant;

    const configuredModels = config?.models ?? [];

    if (configuredModels.length === 0) {
        adminizer.aiAssistantHandler.registerModel(new DummyAiModel());
    } else {
        for (const modelConfig of configuredModels) {
            try {
                if (!modelConfig.handler) {
                    continue;
                }
                const imported = await import(modelConfig.handler);
                const exportKey = modelConfig.exportName ?? 'default';
                const ModelClass: new (...args: any[]) => AbstractAiModel = imported.default ?? imported[exportKey];
                if (!ModelClass) {
                    Adminizer.log.warn(`AI model handler not found for path: ${modelConfig.handler}`);
                    continue;
                }
                const instance = new ModelClass(adminizer, modelConfig.options ?? {});
                adminizer.aiAssistantHandler.registerModel(instance);
            } catch (error) {
                Adminizer.log.error(`Failed to register AI model from ${modelConfig.handler}`, error);
            }
        }
        if (adminizer.aiAssistantHandler.listModels().length === 0) {
            adminizer.aiAssistantHandler.registerModel(new DummyAiModel());
        }
    }

    adminizer.aiAssistantHandler.setDefaultModel(config?.defaultModel ?? adminizer.aiAssistantHandler.getDefaultModelId());
}
