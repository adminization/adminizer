import {
    AbstractAdminizerApp,
    Adminizer,
    AppSetupContext,
} from "../../../dist";
import type {AppAiAssistantContext} from "../../../dist";
import {AiAssistantController} from "../../../dist/controllers/ai/AiAssistantController";
import {AbstractAiModelService} from "../../../dist/lib/ai-assistant/AbstractAiModelService";
import {DummyAiModelService} from "./DummyAiModelService";
import {OpenAiDataAgentService} from "./OpenAiDataAgentService";
import {OpenAiModelService} from "./OpenAiModelService";

interface AiAssistantAppConfig {
    route: string;
    defaultModel?: string;
    models: string[];
}

interface AiAssistantModelDefinition {
    id: string;
    name: string;
    description: string;
    enabled?: () => boolean;
    factory: (context: AppAiAssistantContext) => AbstractAiModelService;
}

const modelDefinitions: Record<string, AiAssistantModelDefinition> = {
    dummy: {
        id: "dummy",
        name: "Dummy assistant",
        description: "Access to dummy AI assistant model",
        factory: () => new DummyAiModelService(),
    },
    openai: {
        id: "openai",
        name: "OpenAI fixture agent",
        description: "Access to OpenAI fixture agent",
        factory: (context) => new OpenAiModelService(context),
    },
    "openai-data": {
        id: "openai-data",
        name: "OpenAI data explorer",
        description: "Access to OpenAI data explorer",
        enabled: () => Boolean(process.env.OPENAI_API_KEY ?? process.env.ADMINIZER_OPENAI_KEY),
        factory: (context) => new OpenAiDataAgentService(context),
    },
};

export class AiAssistantApp extends AbstractAdminizerApp<AiAssistantAppConfig> {
    readonly name = "ai-assistant";
    readonly version = "1.0.0";
    declare readonly config: AiAssistantAppConfig;

    constructor(config: Partial<AiAssistantAppConfig> = {}) {
        super();
        this.config = {
            route: "/api/ai-assistant",
            defaultModel: "openai-data",
            models: ["openai-data", "dummy"],
            ...config,
        };
    }

    setup(ctx: AppSetupContext): void {
        const enabledDefinitions = this.getEnabledModelDefinitions();
        const modelIds = enabledDefinitions.map((model) => model.id);
        const defaultModel = this.resolveDefaultModel(modelIds);

        for (const model of enabledDefinitions) {
            ctx.accessRight({
                id: `ai-assistant-${model.id}`,
                name: model.name,
                description: model.description,
                department: "AI Assistant",
            });
        }

        ctx.aiAssistant({
            models: enabledDefinitions.map((model) => model.factory),
        });

        ctx.config({
            aiAssistant: {
                enabled: true,
                models: modelIds,
                ...(defaultModel ? {defaultModel} : {}),
            },
        });

        ctx.controller({
            id: "models",
            method: "get",
            route: `${this.config.route}/models`,
            middleware: AiAssistantController.getModels,
            policies: [{type: "auth", mode: "api"}],
        });

        ctx.controller({
            id: "history",
            method: "get",
            route: `${this.config.route}/history/:modelId`,
            middleware: AiAssistantController.getHistory,
            policies: [{type: "auth", mode: "api"}],
        });

        ctx.controller({
            id: "query",
            method: "post",
            route: `${this.config.route}/query`,
            middleware: AiAssistantController.sendMessage,
            policies: [{type: "auth", mode: "api"}],
        });

        ctx.controller({
            id: "reset-history",
            method: "delete",
            route: `${this.config.route}/history/:modelId`,
            middleware: AiAssistantController.resetHistory,
            policies: [{type: "auth", mode: "api"}],
        });
    }

    private getEnabledModelDefinitions(): AiAssistantModelDefinition[] {
        const enabled: AiAssistantModelDefinition[] = [];

        for (const modelId of this.config.models) {
            const definition = modelDefinitions[modelId];
            if (!definition) {
                Adminizer.log.warn(`[AiAssistantApp] Unknown AI assistant model "${modelId}". Skipping.`);
                continue;
            }

            if (definition.enabled && !definition.enabled()) {
                Adminizer.log.warn(`[AiAssistantApp] AI assistant model "${modelId}" is disabled by environment. Skipping.`);
                continue;
            }

            enabled.push(definition);
        }

        return enabled.length ? enabled : [modelDefinitions.dummy];
    }

    private resolveDefaultModel(modelIds: string[]): string | undefined {
        if (this.config.defaultModel && modelIds.includes(this.config.defaultModel)) {
            return this.config.defaultModel;
        }

        return modelIds[0];
    }
}
