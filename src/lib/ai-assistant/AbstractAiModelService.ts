import {
    AiAgentConnectionStatus,
    AiAgentLimits,
    AiAgentModelOption,
    AiAgentPublish,
    AiAgentSavedFile,
    AiAgentSessionMeta,
    AiAgentUiHints,
    AiAgentUiSchema,
    AiAgentUploadedFile,
    AiAssistantMessage,
    AiAssistantModelInfo,
} from '../../interfaces/types';
import {User} from '../../models/User';
import type {Adminizer} from '../Adminizer';
import {AbstractAiConversationHistoryService, InMemoryAiConversationHistoryService} from './AbstractAiConversationHistoryService';
import type {AiAssistantAdminLink, AiAssistantNavigationTarget, AiAssistantUiMethod} from './AiAssistantUiMethodHandler';
import type {AiAssistantAgentSkillDescriptor, AiAssistantSkillUser} from './AiAssistantAgentSkillHandler';
import {toJsonSafe} from './jsonSafe';

export interface AiAgentChatCommand {
    /** Command name without the leading slash, e.g. `summarize`. */
    id: string;
    /** Short explanation rendered in the command picker. */
    description?: string;
}

export interface AiAgentChatCommandContext {
    command: AiAgentChatCommand;
    arguments: string;
    input: string | Array<Record<string, unknown>>;
    user: User;
    publish: AiAgentPublish;
}

export interface AiAgentChatCommandResult {
    /** Text rendered as the command response and stored in the dialog. */
    text?: string;
    /** Set false for ephemeral commands that must not enter agent history. */
    persist?: boolean;
}

export type AiAgentChatCommandHandler = (
    context: AiAgentChatCommandContext,
) => Promise<AiAgentChatCommandResult | void> | AiAgentChatCommandResult | void;

/**
 * Base class for AI assistant models. App modules register access rights
 * and expose model metadata through this service.
 *
 * Two levels of capability:
 *
 * 1. `generateReply` — required. A plain request/response chat model; the
 *    assistant panel runs it through the same streaming transport and shows
 *    the answer as a single text part.
 * 2. The optional agent members below. A service that implements `streamReply`
 *    is driven as a real agent: tool calls, reasoning, attachments and a
 *    server-side per-user session (history, compaction, model switching) are
 *    surfaced by the panel. Whatever the service does not implement is simply
 *    not rendered, so partial implementations are fine.
 */
export abstract class AbstractAiModelService {
    public readonly id: string;
    public readonly name: string;
    public readonly description?: string;

    /**
     * Set when the model is registered. Agent implementations need it to read
     * the panel config, the model registry and the user's permissions.
     */
    protected adminizer!: Adminizer;
    public readonly conversationHistory: AbstractAiConversationHistoryService;
    private readonly chatCommands = new Map<string, {
        command: AiAgentChatCommand;
        handler?: AiAgentChatCommandHandler;
    }>();

    protected constructor(
        metadata: AiAssistantModelInfo,
        conversationHistory: AbstractAiConversationHistoryService = new InMemoryAiConversationHistoryService(),
    ) {
        this.id = metadata.id;
        this.name = metadata.name;
        this.description = metadata.description;
        this.conversationHistory = conversationHistory;
    }

    /** Called by AiAssistantHandler on registration; not part of the model API. */
    public attachAdminizer(adminizer: Adminizer): void {
        this.adminizer = adminizer;
        this.conversationHistory.initialize(this, adminizer);
    }

    public getMetadata(): AiAssistantModelInfo {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
        };
    }

    /**
     * Registers a slash command owned by this agent. The panel only displays
     * it and sends its raw `/command arguments` text back to this service;
     * command handling never lives in the browser.
     */
    public registerChatCommand(command: AiAgentChatCommand, handler?: AiAgentChatCommandHandler): void {
        const id = command.id.trim().replace(/^\/+/, '').toLowerCase();
        if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
            throw new Error(`Invalid AI agent command id: ${command.id}`);
        }
        this.chatCommands.set(id, {
            command: {id, description: command.description?.trim() || undefined},
            handler,
        });
    }

    /** Commands available for autocomplete in the panel. */
    public getChatCommands(): AiAgentChatCommand[] {
        const commands = [...this.chatCommands.values()].map(({command}) => ({...command}));
        if (typeof this.compactSession === 'function' && !this.chatCommands.has('compact')) {
            commands.unshift({
                id: 'compact',
                description: 'Prune or summarize older messages to free context.',
            });
        }
        return commands;
    }

    /** One declarative contract for the shared agent UI. */
    public getUiSchema(locale?: string): AiAgentUiSchema {
        return {
            ...(this.getUiHints?.(locale) ?? {}),
            commands: this.getChatCommands(),
            panels: {
                history: true,
                models: typeof this.getModelChoices === 'function' && typeof this.setCurrentModel === 'function',
                limits: typeof this.getLimits === 'function',
            },
        };
    }

    /**
     * Browser capabilities available to a particular user.  Tool-capable
     * services can turn these descriptors into their provider's tool format.
     */
    protected getUiMethods(user: User): Promise<AiAssistantUiMethod[]> {
        return this.adminizer.aiAssistantUiMethodHandler.getAvailable(user);
    }

    /**
     * Server-side implementation of the built-in `search-admin-links` skill.
     * An OpenHarness/AI SDK adapter can return this value directly from its
     * tool's `execute` callback.
     */
    protected searchAdminLinks(user: User, query?: string): Promise<AiAssistantAdminLink[]> {
        return this.adminizer.aiAssistantUiMethodHandler.searchAdminLinks(user, query);
    }

    /**
     * Built-in and app-contributed server skills this user may call. Data
     * skills are already scoped to that user's model permissions, so an agent
     * exposing them can be offered to non-administrator accounts.
     */
    protected getAgentSkills(user: User): Promise<AiAssistantAgentSkillDescriptor[]> {
        return this.adminizer.aiAssistantAgentSkillHandler.getAvailable(user);
    }

    /**
     * Executes an app-owned server skill after its permission check. The result
     * is normalized to plain JSON: it becomes a tool result inside the agent's
     * message history, which every later turn re-validates.
     */
    protected async executeAgentSkill(id: string, input: Record<string, unknown>, user: User): Promise<unknown> {
        const result = await this.adminizer.aiAssistantAgentSkillHandler.execute(id, input, user);
        return toJsonSafe(result) ?? null;
    }

    /** Identity of the user an agent turn is running for. */
    protected describeUser(user: User): AiAssistantSkillUser {
        return this.adminizer.aiAssistantAgentSkillHandler.describeUser(user);
    }

    /**
     * Opens an admin page for the user: either a concrete `href` or a link
     * template plus `params` (a record page, a catalog item…). The target is
     * validated against that user's permissions and the resolved URL is
     * returned, so it can be reported back as the tool result.
     */
    protected async openAdminLink(
        target: AiAssistantNavigationTarget,
        user: User,
        publish: AiAgentPublish,
    ): Promise<string> {
        const href = await this.adminizer.aiAssistantUiMethodHandler.resolveNavigation(user, target);
        await this.publishUiMethod('navigate', {href}, user, publish);
        return href;
    }

    /**
     * Ask the shared panel to execute a registered browser method.  The
     * registry and permission check stay server-side, so an LLM cannot invoke
     * an arbitrary client event.
     */
    protected async publishUiMethod(
        id: string,
        input: Record<string, unknown>,
        user: User,
        publish: AiAgentPublish,
    ): Promise<void> {
        const method = (await this.getUiMethods(user)).find((candidate) => candidate.id === id);
        if (!method) throw new Error(`AI assistant UI method "${id}" is not available`);
        publish({type: 'ui.method', method: method.id, action: method.action, input});
    }

    /**
     * Invoked by the agent transport for a registered `/command`. Returning
     * null intentionally lets an unhandled command flow into `streamReply`
     * or `generateReply` as regular agent input. A handler should return text
     * instead of publishing a plain text frame itself, so its response can be
     * persisted in the active conversation.
     */
    public async executeChatCommand(
        prompt: string,
        input: string | Array<Record<string, unknown>>,
        user: User,
        publish: AiAgentPublish,
    ): Promise<AiAgentChatCommandResult | null> {
        const match = /^\/([a-z][a-z0-9_-]*)(?:\s+([\s\S]*))?$/i.exec(prompt.trim());
        if (!match) return null;
        const entry = this.chatCommands.get(match[1].toLowerCase());
        if (entry?.handler) {
            const result = await entry.handler({command: entry.command, arguments: match[2] ?? '', input, user, publish});
            return {persist: true, ...result};
        }

        if (match[1].toLowerCase() !== 'compact' || typeof this.compactSession !== 'function') return null;
        const result = await this.compactSession(user);
        const compacted = result.compacted === true;
        const before = Number(result.tokensBefore ?? 0);
        const after = Number(result.tokensAfter ?? 0);
        const text = compacted
            ? `Context compacted${before > 0 ? `: ${before} → ${after} tokens.` : '.'}`
            : 'Nothing to compact yet.';
        return {text, persist: true};
    }

    public abstract generateReply(
        prompt: string,
        history: AiAssistantMessage[],
        user: User,
    ): Promise<string>;

    /** True when the service streams runs itself instead of answering in one shot. */
    public isStreamingAgent(): boolean {
        return typeof this.streamReply === 'function';
    }

    /**
     * Run one turn and report progress through `publish`. `input` is either the
     * plain prompt or an ai-sdk style ModelMessage[] when files are attached.
     * The closing `done` frame is emitted by the run manager, not by the service.
     */
    public streamReply?(
        input: string | Array<Record<string, unknown>>,
        user: User,
        publish: AiAgentPublish,
    ): Promise<void>;

    /** Current model, context usage and turn count of this user's session. */
    public getSessionMeta?(user: User): AiAgentSessionMeta;

    /** Session history as ai-sdk ModelMessage[]; the panel rebuilds the thread from it. */
    public getSessionHistory?(user: User): Array<Record<string, unknown>>;

    /** Restores a stored dialog when the user switches conversations. */
    public restoreSessionHistory?(user: User, messages: Array<Record<string, unknown>>): Promise<void> | void;

    /** Drop the session. Returns whether there was anything to drop. */
    public resetSession?(user: User): boolean;

    /** Summarize the session to free context. Returns e.g. tokensBefore/tokensAfter. */
    public compactSession?(user: User): Promise<Record<string, unknown>>;

    /** LLMs the user may switch between inside this service. */
    public getModelChoices?(): Promise<AiAgentModelOption[]>;

    /** Switch the session model. Returns whether the model changed. */
    public setCurrentModel?(user: User, model: string): Promise<boolean>;

    /** Persist uploads before the turn, so tools can refer to them by id. */
    public saveUploadedFiles?(user: User, files: AiAgentUploadedFile[]): Promise<AiAgentSavedFile[]>;

    /**
     * Provisioning state. Omit when the service is always usable; when present
     * and not `ready`, the panel shows a loader instead of the composer.
     */
    public getConnectionStatus?(): Promise<AiAgentConnectionStatus> | AiAgentConnectionStatus;

    /** Budget / rate limits of the provider key, when the provider exposes them. */
    public getLimits?(forceRefresh: boolean): Promise<AiAgentLimits | null>;

    /**
     * Panel copy for this service: title, welcome hint, composer placeholder,
     * starter prompts and connection screens. The locale is resolved from the
     * current admin user before this method is called.
     */
    public getUiHints?(locale?: string): AiAgentUiHints;
}
