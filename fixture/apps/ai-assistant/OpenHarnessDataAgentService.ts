import {z} from 'zod';
import {AbstractAiModelService} from '../../../dist/lib/ai-assistant/AbstractAiModelService';
import {DataAccessor} from '../../../dist/lib/DataAccessor';
import type {
    AiAgentModelOption,
    AiAgentPublish,
    AiAgentSavedFile,
    AiAgentSessionMeta,
    AiAgentUiHints,
    AiAgentUploadedFile,
    AiAssistantMessage,
    ModelResource,
} from '../../../dist/interfaces/types';
import type {ModelConfig} from '../../../dist/interfaces/adminpanelConfig';
import type {User} from '../../../dist/models/User';
import {OpenHarnessConnectionManager} from './OpenHarnessConnectionManager';

const DEFAULT_BASE_URL = 'https://lllm.m42.cx/v1';
const DEFAULT_CONTEXT_WINDOW = 128_000;
const MAX_INLINE_TEXT_CHARS = 256_000;

type ModelChoice = AiAgentModelOption & {model: string; baseURL: string};

/**
 * The fixture version of RestoApp's OpenHarness service.
 *
 * It intentionally uses only environment credentials: broker registration and
 * project settings belong to the host application, while this fixture proves
 * that an independently registered plugin can use the Adminizer agent panel.
 */
export class OpenHarnessDataAgentService extends AbstractAiModelService {
    private readonly defaultModel = process.env.OPENHARNESS_MODEL
        ?? process.env.OPENHARNESS_REGISTER_MODELS?.split(',')[0]?.trim()
        ?? 'grs-base-regular';
    private readonly contextWindow = Number(process.env.OPENHARNESS_CONTEXT_WINDOW) || DEFAULT_CONTEXT_WINDOW;
    private readonly vision = process.env.OPENHARNESS_VISION === 'true';
    private readonly sessions = new Map<number, any>();
    private readonly selectedModels = new Map<number, string>();
    private readonly connection = new OpenHarnessConnectionManager();

    constructor() {
        super({
            id: 'openharness',
            name: 'OpenHarness data explorer',
            description: 'Streams answers and reads only fixture data permitted for the current user.',
        });
        this.connection.onChange(() => this.sessions.clear());
    }

    public async generateReply(prompt: string, _history: AiAssistantMessage[], user: User): Promise<string> {
        let reply = '';
        await this.streamReply(prompt, user, (event) => {
            if (event.type === 'text.delta' && typeof event.text === 'string') reply += event.text;
        });
        return reply || 'OpenHarness finished without returning a message.';
    }

    public async streamReply(
        input: string | Array<Record<string, unknown>>,
        user: User,
        publish: AiAgentPublish,
    ): Promise<void> {
        if (!this.connection.isReady()) throw new Error('OpenHarness is not connected to an LLM endpoint yet.');
        const session = await this.getSession(user);
        for await (const event of session.send(input)) publish(event as any);
    }

    public async getConnectionStatus() {
        return this.connection.refresh();
    }

    public getUiHints(): AiAgentUiHints {
        return {
            title: this.name,
            welcomeHint: 'Ask about the data available to your account.',
            composerPlaceholder: 'Ask about your data… type / for commands',
            suggestions: ['What can you do? List the data models, admin pages and tools available to me.'],
            setupSetting: 'PROJECT_NAME',
        };
    }

    public getSessionMeta(user: User): AiAgentSessionMeta {
        const session = this.sessions.get(user.id);
        return {
            model: this.getCurrentModel(user),
            contextWindow: this.contextWindow,
            vision: this.vision,
            turns: session?.turns ?? 0,
            contextTokens: session ? Math.round(JSON.stringify(session.messages ?? []).length / 4) : 0,
            totalUsage: session?.totalUsage ?? {},
        };
    }

    public getSessionHistory(user: User): Array<Record<string, unknown>> {
        return this.sessions.get(user.id)?.messages ?? [];
    }

    public async restoreSessionHistory(user: User, messages: Array<Record<string, unknown>>): Promise<void> {
        const session = await this.getSession(user);
        session.messages = messages;
        session.turns = messages.filter((message) => message.role === 'user').length;
    }

    public resetSession(user: User): boolean {
        return this.sessions.delete(user.id);
    }

    public async compactSession(user: User): Promise<Record<string, unknown>> {
        const session = this.sessions.get(user.id);
        if (!session?.messages?.length) return {compacted: false};
        let tokensBefore = 0;
        let tokensAfter = 0;
        let messagesRemoved = 0;
        for await (const event of session.compact()) {
            if (event.type === 'compaction.start') tokensBefore = event.tokensBefore ?? 0;
            if (event.type === 'compaction.pruned') messagesRemoved += event.messagesRemoved ?? 0;
            if (event.type === 'compaction.done') tokensAfter = event.tokensAfter ?? 0;
        }
        return {compacted: true, tokensBefore, tokensAfter, messagesRemoved};
    }

    public async getModelChoices(): Promise<AiAgentModelOption[]> {
        return [this.getModelChoice()];
    }

    public async setCurrentModel(user: User, model: string): Promise<boolean> {
        const normalized = model.trim();
        if (!normalized || normalized !== this.getModelChoice().id) {
            throw new Error(`Model "${model}" is not available in this fixture.`);
        }
        if (this.getCurrentModel(user) === normalized) return false;
        this.selectedModels.set(user.id, normalized);
        this.resetSession(user);
        return true;
    }

    public async saveUploadedFiles(_user: User, files: AiAgentUploadedFile[]): Promise<AiAgentSavedFile[]> {
        return files.map((file, index) => ({
            id: `fixture-file-${Date.now()}-${index}`,
            name: file.originalname || 'attachment',
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size ?? file.buffer.length,
        }));
    }

    private getCurrentModel(user: User): string {
        return this.selectedModels.get(user.id) ?? this.getModelChoice().id;
    }

    private getModelChoice(): ModelChoice {
        const model = this.defaultModel;
        return {
            id: model,
            model,
            baseURL: this.connection.getCredentialsSync()?.baseUrl ?? DEFAULT_BASE_URL,
            contextWindow: this.contextWindow,
            maxOutputTokens: null,
            vision: this.vision,
            costCoefficient: null,
        };
    }

    private async getSession(user: User): Promise<any> {
        const credentials = this.connection.getCredentialsSync();
        if (!credentials) throw new Error('OpenHarness is not connected to an LLM endpoint yet.');
        const existing = this.sessions.get(user.id);
        const fingerprint = `${credentials.baseUrl}:${credentials.apiKey}`;
        if (existing?.__openharnessFingerprint === fingerprint) return existing;

        const load = (name: string): Promise<any> => Function('name', 'return import(name)')(name);
        const [{Agent, Session}, {createOpenAI}, {tool}] = await Promise.all([
            load('@openharness/core'), load('@ai-sdk/openai'), load('ai'),
        ]);
        const choice = this.getModelChoice();
        const provider = createOpenAI({apiKey: credentials.apiKey, baseURL: credentials.baseUrl});
        const readable = this.listReadableModels(user);
        const readableNames = readable.map(({name}) => name).join(', ') || 'none';

        const queryModelRecords = tool({
            description: `Read fixture records from a permitted Adminizer model. Available models: ${readableNames}.`,
            inputSchema: z.object({
                model: z.string().min(1),
                filter: z.string().optional(),
                fields: z.array(z.string().min(1)).optional(),
                limit: z.number().int().min(1).max(50).optional(),
            }),
            execute: async (input: {model: string; filter?: string; fields?: string[]; limit?: number}) => {
                const entity = this.resolveEntity(input.model);
                let criteria: Record<string, unknown> = {};
                if (input.filter?.trim()) {
                    try { criteria = JSON.parse(input.filter); } catch { throw new Error('filter must be valid JSON'); }
                }
                const accessor = new DataAccessor(this.adminizer, user, entity, 'list');
                const records = await entity.model.find(criteria, accessor);
                const limited = records.slice(0, input.limit ?? 10);
                const projected = input.fields?.length
                    ? limited.map((record: Record<string, unknown>) => this.pickFields(record, input.fields!))
                    : limited;
                return {model: entity.name, count: projected.length, records: projected};
            },
        });

        const agent = new Agent({
            name: this.name,
            model: provider.chat(choice.model),
            instructions: [
                'You are the Adminizer fixture data assistant.',
                `You may read only these models: ${readableNames}.`,
                'Use query_model_records for factual questions about fixture data. Never claim a write succeeded: this agent has no write tools.',
            ].join('\n'),
            maxSteps: 6,
            tools: {query_model_records: queryModelRecords},
        });
        const session = new Session({agent, contextWindow: choice.contextWindow});
        session.__openharnessFingerprint = fingerprint;
        this.sessions.set(user.id, session);
        return session;
    }

    private resolveEntity(name: string): ModelResource {
        const normalized = name.trim().toLowerCase();
        const resource = this.getModelResources().find((entry) =>
            entry.name.toLowerCase() === normalized || entry.config?.model?.toLowerCase() === normalized,
        );
        if (!resource?.model) throw new Error(`Model "${name}" is not available.`);
        return resource;
    }

    private listReadableModels(user: User): Array<{name: string; config: ModelConfig}> {
        return this.getModelResources()
            .filter((resource) => this.adminizer.accessRightsHelper.hasPermission(`read-${resource.name}-model`, user))
            .map((resource) => ({name: resource.name, config: resource.config!}));
    }

    private getModelResources(): ModelResource[] {
        const prefix = this.adminizer.config.routePrefix;
        return Object.entries(this.adminizer.config.models ?? []).flatMap(([name, value]) => {
            const config: ModelConfig = typeof value === 'boolean'
                ? {model: name, title: name, icon: 'description'} as ModelConfig
                : value as ModelConfig;
            const modelName = config.model ?? name;
            const model = this.adminizer.modelHandler.model.get(modelName.toLowerCase());
            return model ? [{name, uri: `${prefix}/model/${name}`, config, model}] : [];
        });
    }

    private pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
        return Object.fromEntries(fields.filter((field) => field in record).map((field) => [field, record[field]]));
    }
}
