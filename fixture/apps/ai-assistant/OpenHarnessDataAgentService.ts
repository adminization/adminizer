import {z} from 'zod';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AbstractAiModelService} from '../../../dist/lib/ai-assistant/AbstractAiModelService';
import {toJsonSafe} from '../../../dist/lib/ai-assistant/jsonSafe';
import type {
    AiAgentModelOption,
    AiAgentPublish,
    AiAgentSavedFile,
    AiAgentSessionMeta,
    AiAgentUiHints,
    AiAgentUploadedFile,
    AiAssistantMessage,
} from '../../../dist/interfaces/types';
import type {User} from '../../../dist/models/User';
import {OpenHarnessConnectionManager} from './OpenHarnessConnectionManager';

const DEFAULT_BASE_URL = 'https://lllm.m42.cx/v1';
const DEFAULT_CONTEXT_WINDOW = 128_000;
const MAX_INLINE_TEXT_CHARS = 256_000;
const MODEL_CATALOG_TTL_MS = 3 * 60_000;
const PROMPTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prompts');

const BROKER_WAITING_DESCRIPTION = 'The assistant registers itself with the LLM gateway. The broker issues at most one key per hour, so this can take a while — the page keeps retrying automatically.';
const BROKER_ERROR_DESCRIPTION = 'The assistant registers itself with the LLM gateway. The page will retry automatically.';
const OPENHARNESS_RU: Record<string, string> = {
    'Connecting the assistant…': 'Подключение ассистента…',
    'Waiting for the next registration slot': 'Ожидание следующего окна регистрации',
    'Next attempt at': 'Следующая попытка в',
    'Server setup required': 'Требуется завершить настройку сервера',
    'Set the PROJECT_NAME setting to finish the server setup — the assistant needs it to register.': 'Заполните настройку PROJECT_NAME, чтобы завершить настройку сервера — она нужна ассистенту для регистрации.',
    'Registration attempt failed': 'Попытка регистрации не удалась',
    [BROKER_WAITING_DESCRIPTION]: 'Ассистент регистрируется на LLM-шлюзе. Брокер выдаёт не более одного ключа в час, поэтому это может занять время — страница повторяет попытки автоматически.',
    [BROKER_ERROR_DESCRIPTION]: 'Ассистент регистрируется на LLM-шлюзе. Страница повторит попытку автоматически.',
};

const openHarnessText = (locale: string | undefined, text: string): string =>
    locale?.toLowerCase().split(/[-_]/)[0] === 'ru' ? OPENHARNESS_RU[text] ?? text : text;

type ModelChoice = AiAgentModelOption & {model: string; baseURL: string};
type PromptValues = Record<string, string | number | boolean | null | undefined>;

function normalizePromptKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function promptPath(name: string): string {
    return path.join(PROMPTS_DIR, `${name}.txt`);
}

function promptExists(name: string): boolean {
    return existsSync(promptPath(name));
}

function loadSystemPrompt(names: string | string[], values: PromptValues): string {
    const templates = ['common', ...(Array.isArray(names) ? names : [names])]
        .filter((name, index) => index === 0 || promptExists(name))
        .map((name) => readFileSync(promptPath(name), 'utf8').trim());
    return templates.join('\n\n').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
        const value = values[key];
        return value === undefined || value === null ? '' : String(value);
    }).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * The fixture version of RestoApp's OpenHarness service.
 *
 * It intentionally uses only environment credentials: broker registration and
 * project settings belong to the host application, while this fixture proves
 * that an independently registered plugin can use the Adminizer agent panel.
 */
export class OpenHarnessDataAgentService extends AbstractAiModelService {
    private readonly defaultModel = process.env.OPENHARNESS_MODEL?.trim() ?? '';
    private readonly contextWindow = Number(process.env.OPENHARNESS_CONTEXT_WINDOW) || DEFAULT_CONTEXT_WINDOW;
    private readonly vision = process.env.OPENHARNESS_VISION === 'true';
    private readonly sessions = new Map<number, any>();
    private readonly selectedModels = new Map<number, string>();
    private readonly connection = new OpenHarnessConnectionManager();
    private modelCatalogCache: {fetchedAt: number; models: ModelChoice[]} | null = null;

    constructor() {
        super({
            id: 'openharness',
            name: 'OpenHarness data explorer',
            description: 'Streams answers and reads only fixture data permitted for the current user.',
        });
        this.connection.onChange(() => {
            this.sessions.clear();
            this.modelCatalogCache = null;
        });
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
        const session = await this.getSession(user, publish);
        // MCP servers and subagent tools also write into this history, so a
        // session that already holds a non-JSON tool result is repaired here
        // instead of failing prompt validation for the rest of its life.
        session.messages = toJsonSafe(session.messages ?? []);
        for await (const event of session.send(input)) publish(event as any);
    }

    public async getConnectionStatus() {
        return this.connection.refresh();
    }

    public getUiHints(locale?: string): AiAgentUiHints {
        const text = (value: string) => openHarnessText(locale, value);
        return {
            title: this.name,
            welcomeHint: 'Ask about the data available to your account.',
            composerPlaceholder: 'Ask about your data… type / for commands',
            suggestions: ['What can you do? List the data models, admin pages and tools available to me.'],
            connectionScreens: {
                registering: {
                    title: text('Connecting the assistant…'),
                    description: text(BROKER_WAITING_DESCRIPTION),
                    icon: 'spinner',
                },
                waiting_retry: {
                    title: text('Waiting for the next registration slot'),
                    description: text(BROKER_WAITING_DESCRIPTION),
                    icon: 'spinner',
                    details: [
                        {field: 'nextAttemptAt', label: text('Next attempt at'), format: 'local-time'},
                        {field: 'lastError', tone: 'error'},
                    ],
                },
                setup_required: {
                    title: text('Server setup required'),
                    description: text('Set the PROJECT_NAME setting to finish the server setup — the assistant needs it to register.'),
                    icon: 'bot',
                },
                error: {
                    title: text('Registration attempt failed'),
                    description: text(BROKER_ERROR_DESCRIPTION),
                    icon: 'error',
                    details: [
                        {field: 'nextAttemptAt', label: text('Next attempt at'), format: 'local-time'},
                        {field: 'lastError', tone: 'error'},
                    ],
                },
            },
        };
    }

    public getSessionMeta(user: User): AiAgentSessionMeta {
        const session = this.sessions.get(user.id);
        return {
            model: this.getCurrentModel(user),
            contextWindow: this.contextWindow,
            vision: this.vision,
            turns: session?.messages.filter((message: Record<string, unknown>) => message.role === 'user').length ?? 0,
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
        return this.getAvailableModelChoices();
    }

    public async setCurrentModel(user: User, model: string): Promise<boolean> {
        const normalized = model.trim();
        const available = await this.getAvailableModelChoices();
        if (!normalized || !available.some((choice) => choice.id === normalized)) {
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
        return this.getCurrentModelChoice(user).id;
    }

    private getCurrentModelChoice(user: User): ModelChoice {
        const selected = this.selectedModels.get(user.id);
        const cached = this.modelCatalogCache?.models ?? [];
        if (selected) {
            const choice = cached.find((entry) => entry.id === selected);
            if (choice) return choice;
        }
        if (this.defaultModel) {
            const choice = cached.find((entry) => entry.id === this.defaultModel);
            if (choice) return choice;
        }
        return cached[0] ?? this.getFallbackModelChoice();
    }

    private getFallbackModelChoice(): ModelChoice {
        const model = this.defaultModel || 'default';
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

    private getModelPromptName(modelId: string): string {
        const candidate = `openharness-model-${normalizePromptKey(modelId)}`;
        return promptExists(candidate) ? candidate : 'openharness-model-default';
    }

    /**
     * LiteLLM scopes the OpenAI-compatible model list to the caller's key.
     * Keep the catalogue short-lived so a broker key change or permission
     * update is reflected without making every metadata request hit the proxy.
     */
    private async getAvailableModelChoices(): Promise<ModelChoice[]> {
        const cached = this.modelCatalogCache;
        if (cached && Date.now() - cached.fetchedAt < MODEL_CATALOG_TTL_MS) return cached.models;

        const credentials = this.connection.getCredentialsSync();
        if (!credentials) return [this.getFallbackModelChoice()];

        try {
            const baseURL = credentials.baseUrl.replace(/\/+$/, '');
            const response = await fetch(`${baseURL}/models`, {
                headers: {Accept: 'application/json', Authorization: `Bearer ${credentials.apiKey}`},
            });
            if (!response.ok) throw new Error(`Model catalogue request failed with HTTP ${response.status}`);
            const body = await response.json() as {
                data?: Array<{id?: string; max_input_tokens?: number | null; max_output_tokens?: number | null}>;
            };
            const models = Array.from(new Map((body.data ?? []).flatMap((entry): Array<[string, ModelChoice]> => {
                const id = entry.id?.trim();
                if (!id) return [];
                return [[id, {
                    id,
                    model: id,
                    baseURL,
                    contextWindow: Number.isFinite(entry.max_input_tokens) ? entry.max_input_tokens ?? null : null,
                    maxOutputTokens: Number.isFinite(entry.max_output_tokens) ? entry.max_output_tokens ?? null : null,
                    vision: this.vision,
                    costCoefficient: null,
                }]];
            })).values());
            if (!models.length) throw new Error('Model catalogue is empty');
            this.modelCatalogCache = {fetchedAt: Date.now(), models};
            return models;
        } catch {
            return [this.getFallbackModelChoice()];
        }
    }

    private async getSession(user: User, publish?: AiAgentPublish): Promise<any> {
        const credentials = this.connection.getCredentialsSync();
        if (!credentials) throw new Error('OpenHarness is not connected to an LLM endpoint yet.');
        const existing = this.sessions.get(user.id);
        const fingerprint = `${credentials.baseUrl}:${credentials.apiKey}`;
        if (existing?.__openharnessFingerprint === fingerprint) {
            if (publish) existing.__openharnessPublish = publish;
            return existing;
        }

        const load = (name: string): Promise<any> => Function('name', 'return import(name)')(name);
        const [{Agent, Session}, {createOpenAI}, {tool, jsonSchema}] = await Promise.all([
            load('@openharness/core'), load('@ai-sdk/openai'), load('ai'),
        ]);
        const choices = await this.getAvailableModelChoices();
        const choice = choices.find((entry) => entry.id === this.getCurrentModel(user)) ?? choices[0];
        const provider = createOpenAI({apiKey: credentials.apiKey, baseURL: credentials.baseUrl});

        const searchAdminLinks = tool({
            description: 'Search admin pages visible to the current user. Returns concrete links and link'
                + ' templates: a template has params and is opened by passing its id plus values.',
            inputSchema: z.object({query: z.string().min(1)}),
            execute: async ({query}: {query: string}) => ({links: await this.searchAdminLinks(user, query)}),
        });

        let session: any;
        const navigateAdmin = tool({
            description: 'Open an admin page in the user\'s browser tab. Pass href for a concrete link, or'
                + ' template plus params (e.g. {"id": "…"}) for a record page returned by search_admin_links.',
            inputSchema: z.object({
                href: z.string().min(1).optional(),
                template: z.string().min(1).optional(),
                params: z.record(z.string(), z.string()).optional(),
            }),
            execute: async (input: {href?: string; template?: string; params?: Record<string, string>}) => {
                if (!session?.__openharnessPublish) {
                    throw new Error('Navigation is available only during an active assistant response.');
                }
                return {opened: await this.openAdminLink(input, user, session.__openharnessPublish)};
            },
        });

        // Adminizer skills are provider-neutral (JSON Schema + an execute
        // callback), so their schema is handed to the model as-is. Built-in
        // data skills are already scoped to this user's permissions.
        const skills = await this.getAgentSkills(user);
        const skillTools = Object.fromEntries(skills.map((skill) => [skill.id, tool({
            description: skill.description,
            inputSchema: jsonSchema(skill.inputSchema),
            execute: async (input: Record<string, unknown>) => this.executeAgentSkill(skill.id, input, user),
        })]));
        const availableTools = [...Object.keys(skillTools), 'search_admin_links', 'navigate_admin'].sort().join(', ');

        const agent = new Agent({
            name: this.name,
            model: provider.chat(choice.model),
            instructions: loadSystemPrompt(['openharness', this.getModelPromptName(choice.id)], {
                active_provider_model: choice.id,
                active_user: this.describeUser(user).login,
                available_tools: availableTools,
            }),
            maxSteps: 6,
            tools: {
                ...skillTools,
                search_admin_links: searchAdminLinks,
                navigate_admin: navigateAdmin,
            },
        });
        session = new Session({agent, contextWindow: choice.contextWindow ?? this.contextWindow});
        session.__openharnessFingerprint = fingerprint;
        session.__openharnessPublish = publish;
        this.sessions.set(user.id, session);
        return session;
    }

}
