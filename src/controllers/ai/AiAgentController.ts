import multer from 'multer';
import {Adminizer} from '../../lib/Adminizer';
import {AbstractAiModelService} from '../../lib/ai-assistant/AbstractAiModelService';
import {AiAgentRunManager} from '../../lib/ai-assistant/AiAgentRunManager';
import {
    AiAgentConnectionStatus,
    AiAgentPublish,
    AiAgentSessionMeta,
    AiAgentUploadedFile,
    AiAssistantMessage,
} from '../../interfaces/types';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
/**
 * Inline cap per text attachment: roughly 64k tokens, half of a typical 128k
 * context window, so a single file cannot immediately trigger compaction.
 */
const MAX_INLINE_TEXT_CHARS = 256 * 1024;

const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'html', 'css',
    'js', 'ts', 'jsx', 'tsx', 'sql', 'log', 'ini', 'conf', 'env', 'sh', 'graphql',
]);
const TEXT_MIME_TYPES = new Set([
    'application/json', 'application/xml', 'application/x-yaml', 'application/sql', 'image/svg+xml',
]);

const runs = new AiAgentRunManager();

// multer only engages on multipart/form-data; JSON bodies pass through untouched.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: MAX_FILE_SIZE, files: MAX_FILES, fieldSize: 1024 * 1024},
}).array('files', MAX_FILES);

function isTextFile(file: AiAgentUploadedFile): boolean {
    const mime = file.mimetype || '';
    if (mime.startsWith('text/')) return true;
    if (TEXT_MIME_TYPES.has(mime)) return true;
    const ext = (file.originalname || '').split('.').pop()?.toLowerCase() || '';
    return TEXT_EXTENSIONS.has(ext);
}

/** Turns prompt + uploaded files into an ai-sdk ModelMessage[] for the agent. */
function buildInput(
    prompt: string,
    files: AiAgentUploadedFile[],
    vision: boolean,
    savedFiles: Array<Record<string, unknown>> = [],
): string | Array<Record<string, unknown>> {
    if (!files?.length) return prompt;

    const parts: Array<Record<string, unknown>> = [];
    if (prompt) parts.push({type: 'text', text: prompt});

    for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const saved = savedFiles[index];
        const name = file.originalname || 'file';
        const savedNote = saved?.id
            ? ` saved_file_id=${JSON.stringify(saved.id)} saved_file_name=${JSON.stringify(saved.name || name)}`
            : '';

        if (isTextFile(file)) {
            let text = file.buffer.toString('utf8');
            let note = '';
            if (text.length > MAX_INLINE_TEXT_CHARS) {
                text = text.slice(0, MAX_INLINE_TEXT_CHARS);
                note = `\n[attachment truncated at ${MAX_INLINE_TEXT_CHARS} characters]`;
            }
            parts.push({
                type: 'text',
                text: `<attachment name=${JSON.stringify(name)}${savedNote}>\n${text}${note}\n</attachment>`,
            });
        } else if ((file.mimetype || '').startsWith('image/')) {
            if (vision) {
                parts.push({type: 'image', image: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`});
            } else {
                parts.push({
                    type: 'text',
                    text: `[Image attached: ${name}${saved?.id ? `, saved_file_id=${saved.id}` : ''} — the current model cannot see images]`,
                });
            }
        } else {
            parts.push({
                type: 'text',
                text: `[Unsupported attachment saved but not inlined: ${name}${saved?.id ? `, saved_file_id=${saved.id}` : ''} (${file.mimetype || 'unknown type'})]`,
            });
        }
    }

    return [{role: 'user', content: parts}];
}

/**
 * Streaming agent endpoints, consumed by the assistant panel bundle
 * (src/assets/js/ai-assistant).
 *
 * Every route is scoped to one registered model service; permissions are
 * enforced by the router (`ai-assistant-<modelId>`). Services that implement
 * only `generateReply` are supported too — their answer is streamed as a
 * single text frame, so one UI serves both kinds.
 */
export class AiAgentController {

    /** GET /api/ai-assistant/agent/:modelId/status */
    static async getStatus(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;

        const locale = AiAgentController.resolveLocale(req);
        const schema = {
            ...service.getUiSchema(locale),
            uiMethods: req.adminizer.aiAssistantUiMethodHandler.getAvailable(req.user),
        };

        if (typeof service.getConnectionStatus !== 'function') {
            res.json({state: 'ready', locale, schema});
            return;
        }

        try {
            const status = await service.getConnectionStatus();
            res.json({...status, locale, schema});
        } catch (error) {
            Adminizer.log.error('AI agent status check failed', error);
            res.status(500).json({error: (error as Error)?.message || 'Status check failed'});
        }
    }

    /** GET /api/ai-assistant/agent/:modelId/limits */
    static async getLimits(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service || !await AiAgentController.ensureReady(service, res)) return;

        if (typeof service.getLimits !== 'function') {
            res.json({provider: service.id, supported: false});
            return;
        }

        const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
        try {
            const limits = await service.getLimits(forceRefresh);
            res.json(limits ?? {provider: service.id, supported: false});
        } catch (error) {
            res.status(500).json({error: (error as Error)?.message || 'Failed to read limits'});
        }
    }

    /** GET /api/ai-assistant/agent/:modelId/meta */
    static async getMeta(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service || !await AiAgentController.ensureReady(service, res)) return;

        try {
            res.json(await AiAgentController.buildMeta(service, req));
        } catch (error) {
            Adminizer.log.error('AI agent meta failed', error);
            res.status(500).json({error: (error as Error)?.message || 'Failed to load agent info'});
        }
    }

    /** POST /api/ai-assistant/agent/:modelId/model */
    static async setModel(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service || !await AiAgentController.ensureReady(service, res)) return;

        if (typeof service.setCurrentModel !== 'function') {
            res.status(501).json({error: 'This assistant does not support switching models'});
            return;
        }

        const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
        if (!model) {
            res.status(400).json({error: 'Model is required.'});
            return;
        }

        try {
            await service.setCurrentModel(req.user, model);
            res.json(await AiAgentController.buildMeta(service, req));
        } catch (error) {
            res.status(500).json({error: (error as Error)?.message || 'Failed to switch the model'});
        }
    }

    /** GET /api/ai-assistant/agent/:modelId/history */
    static async getHistory(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;

        const messages = await AiAgentController.syncActiveConversation(service, req);
        res.json({messages});
    }

    /** GET /api/ai-assistant/agent/:modelId/conversations */
    static async listConversations(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;
        await AiAgentController.syncActiveConversation(service, req);
        const active = service.conversationHistory.getActive(req.user);
        res.json({activeId: active.id, conversations: service.conversationHistory.list(req.user).map(AiAgentController.serializeConversation)});
    }

    /** POST /api/ai-assistant/agent/:modelId/conversations */
    static async createConversation(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;
        await AiAgentController.syncActiveConversation(service, req);
        const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : undefined;
        const conversation = service.conversationHistory.create(req.user, title || undefined);
        await AiAgentController.restoreConversation(service, req, conversation.messages);
        res.status(201).json({conversation: AiAgentController.serializeConversation(conversation)});
    }

    /** POST /api/ai-assistant/agent/:modelId/conversations/:conversationId/select */
    static async selectConversation(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;
        await AiAgentController.syncActiveConversation(service, req);
        const conversation = service.conversationHistory.select(req.user, req.params.conversationId);
        if (!conversation) {
            res.sendStatus(404);
            return;
        }
        await AiAgentController.restoreConversation(service, req, conversation.messages);
        res.json({conversation: AiAgentController.serializeConversation(conversation)});
    }

    /** DELETE /api/ai-assistant/agent/:modelId/conversations/:conversationId */
    static async deleteConversation(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;
        const conversationId = req.params.conversationId;
        const active = service.conversationHistory.getActive(req.user);
        if (active.id === conversationId) {
            res.status(400).json({error: 'Create or select another conversation before deleting this one'});
            return;
        }
        res.json({deleted: service.conversationHistory.remove(req.user, conversationId)});
    }

    /**
     * POST /api/ai-assistant/agent/:modelId/runs
     *
     * Starts a turn and answers 202 with the stream URL. The run itself is
     * kicked off after the response so the browser can open the EventSource
     * before the first frame is published.
     */
    static async startRun(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service || !await AiAgentController.ensureReady(service, res)) return;

        upload(req as never, res as never, async (uploadError: any): Promise<void> => {
            if (uploadError) {
                const message = uploadError.code === 'LIMIT_FILE_SIZE'
                    ? `File is too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`
                    : uploadError.message || 'Upload failed';
                res.status(413).json({error: message});
                return;
            }

            const prompt = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
            const files: AiAgentUploadedFile[] = (req as any).files || [];
            if (!prompt && !files.length) {
                res.status(400).json({error: 'Message is required'});
                return;
            }

            try {
                const savedFiles = typeof service.saveUploadedFiles === 'function'
                    ? await service.saveUploadedFiles(req.user, files)
                    : [];
                const vision = Boolean(service.getSessionMeta?.(req.user)?.vision);
                const input = buildInput(prompt || 'See the attached files.', files, vision, savedFiles);

                const run = runs.create(req.user.id, service.id);
                const prefix = req.adminizer.config.routePrefix;
                res.status(202).json({
                    runId: run.id,
                    stream: `${prefix}/api/ai-assistant/agent/${encodeURIComponent(service.id)}/runs/${run.id}/stream`,
                });

                setImmediate(() => {
                    void (async () => {
                        try {
                            await AiAgentController.execute(service, req, input, prompt, (event) => runs.publish(run, event));
                            runs.finish(run, {type: 'done'});
                        } catch (error) {
                            Adminizer.log.error('AI agent run failed', error);
                            runs.finish(run, {type: 'error', error: (error as Error)?.message || 'Agent run failed'});
                        }
                    })();
                });
            } catch (error) {
                Adminizer.log.error('AI agent run could not be started', error);
                res.status(500).json({error: (error as Error)?.message || 'Failed to start the run'});
            }
        });
    }

    /** GET /api/ai-assistant/agent/:modelId/runs/:runId/stream */
    static async streamRun(req: ReqType, res: ResType): Promise<void> {
        const service = AiAgentController.resolveService(req, res);
        if (!service) return;

        const run = runs.get(req.params.runId, req.user.id);
        if (!run || run.modelId !== service.id) {
            res.sendStatus(404);
            return;
        }

        runs.subscribe(run, req, res);
    }

    /**
     * Streaming agents publish their own frames; a legacy `generateReply` model
     * is wrapped into the same protocol so the panel needs no special case.
     */
    private static async execute(
        service: AbstractAiModelService,
        req: ReqType,
        input: string | Array<Record<string, unknown>>,
        prompt: string,
        publish: AiAgentPublish,
    ): Promise<void> {
        const commandResult = await service.executeChatCommand(prompt, input, req.user, publish);
        if (commandResult) {
            if (commandResult.text) {
                publish({type: 'text.delta', text: commandResult.text});
                publish({type: 'text.done'});
            }
            publish({type: 'turn.done'});
            if (commandResult.persist !== false && commandResult.text) {
                await AiAgentController.appendCommandToSession(service, req, prompt, commandResult.text);
            }
            service.conversationHistory.saveActive(req.user, AiAgentController.getSessionMessages(service, req));
            return;
        }

        if (service.isStreamingAgent()) {
            await service.streamReply!(input, req.user, publish);
            service.conversationHistory.saveActive(req.user, AiAgentController.getSessionMessages(service, req));
            return;
        }

        const {history} = await req.adminizer.aiAssistantHandler.sendMessage(req.user, service.id, prompt);
        service.conversationHistory.saveActive(req.user, history.map((message) => ({
            role: message.role,
            content: [{type: 'text', text: message.content}],
        })));
        const reply = history[history.length - 1]?.content ?? '';
        publish({type: 'text.delta', text: reply});
        publish({type: 'text.done'});
        publish({type: 'turn.done'});
    }

    /** Session meta plus the model catalogue and the upload caps of this transport. */
    private static async buildMeta(service: AbstractAiModelService, req: ReqType): Promise<Record<string, unknown>> {
        const availableModels = typeof service.getModelChoices === 'function'
            // Warming the catalogue first means a cold-start meta call reports a
            // real discovered model instead of a configured placeholder.
            ? await service.getModelChoices()
            : [];
        const meta: AiAgentSessionMeta = service.getSessionMeta?.(req.user) ?? {
            model: service.id,
            contextWindow: 0,
            vision: false,
            turns: req.adminizer.aiAssistantHandler.getHistory(req.user.id, service.id).length,
            contextTokens: 0,
            totalUsage: {},
        };

        return {...meta, availableModels, maxFiles: MAX_FILES, maxFileSize: MAX_FILE_SIZE};
    }

    private static getSessionMessages(service: AbstractAiModelService, req: ReqType): Array<Record<string, unknown>> {
        if (typeof service.getSessionHistory === 'function') return service.getSessionHistory(req.user);
        return req.adminizer.aiAssistantHandler.getHistory(req.user.id, service.id).map((message: AiAssistantMessage) => ({
            role: message.role,
            content: [{type: 'text', text: message.content}],
        }));
    }

    /**
     * The persisted dialog is restored into a fresh agent session before it is
     * saved again. This keeps initial demo dialogs and database-backed history
     * intact when an agent has not created its in-memory session yet.
     */
    private static async syncActiveConversation(
        service: AbstractAiModelService,
        req: ReqType,
    ): Promise<Array<Record<string, unknown>>> {
        const messages = AiAgentController.getSessionMessages(service, req);
        const active = service.conversationHistory.getActive(req.user);
        if (messages.length === 0 && active.messages.length > 0) {
            await AiAgentController.restoreConversation(service, req, active.messages);
            return active.messages;
        }
        service.conversationHistory.saveActive(req.user, messages);
        return messages;
    }

    private static async restoreConversation(
        service: AbstractAiModelService,
        req: ReqType,
        messages: Array<Record<string, unknown>>,
    ): Promise<void> {
        if (typeof service.restoreSessionHistory === 'function') {
            await service.restoreSessionHistory(req.user, messages);
            return;
        }
        if (typeof service.getSessionHistory === 'function') {
            throw new Error('This agent does not support restoring conversations yet.');
        }
        req.adminizer.aiAssistantHandler.replaceHistory(req.user.id, service.id, messages.map((message) => {
            const content = Array.isArray(message.content) ? message.content : [];
            const text = content.find((part: any) => part?.type === 'text')?.text ?? '';
            return {id: `${Date.now()}-${Math.random()}`, role: message.role as AiAssistantMessage['role'], content: String(text), timestamp: new Date(), modelId: service.id};
        }));
    }

    /** Persists command turns just like ordinary chat turns for both agent kinds. */
    private static async appendCommandToSession(
        service: AbstractAiModelService,
        req: ReqType,
        prompt: string,
        response: string,
    ): Promise<void> {
        const messages = [
            ...AiAgentController.getSessionMessages(service, req),
            {role: 'user', content: [{type: 'text', text: prompt}]},
            {role: 'assistant', content: [{type: 'text', text: response}]},
        ];
        await AiAgentController.restoreConversation(service, req, messages);
    }

    private static serializeConversation(conversation: {id: string; title: string; createdAt: string; updatedAt: string}) {
        return conversation;
    }

    /**
     * Resolves the registered model service for this request, answering the
     * response itself when the assistant is off, unknown or unusable.
     */
    private static resolveService(req: ReqType, res: ResType): AbstractAiModelService | null {
        if (!req.adminizer.config.aiAssistant?.enabled) {
            res.status(503).json({error: 'AI assistant is disabled'});
            return null;
        }

        const handler = req.adminizer.aiAssistantHandler;
        if (!handler) {
            res.status(500).json({error: 'AI assistant is not available'});
            return null;
        }

        const modelId = req.params?.modelId;
        const service = modelId ? handler.getModel(modelId) : undefined;
        if (!service) {
            res.status(404).json({error: `AI assistant model not found: ${modelId}`});
            return null;
        }

        return service;
    }

    /** Endpoints that talk to the LLM also require a provisioned connection. */
    private static async ensureReady(service: AbstractAiModelService, res: ResType): Promise<boolean> {
        if (typeof service.getConnectionStatus !== 'function') return true;

        const status: AiAgentConnectionStatus = await service.getConnectionStatus();
        if (status?.state === 'ready') return true;

        res.status(503).json({
            error: 'The assistant is not connected to an LLM endpoint yet.',
            status,
        });
        return false;
    }

    /** Admin UI language, resolved the way Inertia shares it with the pages. */
    private static resolveLocale(req: ReqType): string {
        const translation = req.adminizer.config.translation;
        const defaultLocale = typeof translation !== 'boolean' ? translation?.defaultLocale ?? 'en' : 'en';
        const available = typeof translation !== 'boolean' ? translation?.locales ?? [] : [];
        const requested = String(req.user?.locale || defaultLocale);
        const normalized = requested.replace('_', '-').split('-')[0];

        if (available.includes(requested)) return requested;
        if (available.includes(normalized)) return normalized;
        return defaultLocale;
    }
}
