import {AbstractModel} from "../lib/model/AbstractModel";
import {ModelConfig} from "./adminpanelConfig";
import {Inertia} from '../lib/inertia/inertiaAdapter';
import {Flash} from '../lib/inertia/flash';
import {Adminizer} from "../lib/Adminizer";
import multer from "multer";
import {I18n} from "../lib/I18n";
import type {User} from "../models/User";

export interface ModelResource {
    name: string
    config?: ModelConfig
    model?: AbstractModel<any>
    uri: string
}

export interface AccessRightsToken {
    name: string
    description: string
    department: string
    id: string
    getOptions?: (user: User) => Promise<PermissionOption[]>
    check?: (user: User, context?: PermissionContext) => Promise<boolean>
}

export interface PermissionOption {
    id: string
    name: string
    description?: string
}

export interface PermissionContext {
    rights?: string[]
    [key: string]: unknown
}

/** Serialized as a JSON string in Group.tokens for a contextual token. */
export interface GroupPermissionGrant {
    tokenId: string
    rights: string[]
}

export type PermissionGrant = string | GroupPermissionGrant

export interface PropsField {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | number | string[];
    disabled?: boolean;
    required?: boolean;
    isIn?: string[] | number[] | boolean[];
    options?: Record<string, any> | Record<string, any>[]
    relatedModel?: string;
    canCreateRelated?: boolean;
}

export interface DiffChanges {
    field: string;
    oldValue: any;
    newValue: any;
    type: string;
}

export interface Diff {
    changes: DiffChanges[]
    summary: string
}

export interface INotification {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    userId?: number;
    read?: boolean;
    icon: {
        icon: string;
        iconColor: string;
    }
    notificationClass: string; // Notification class: 'general', 'system', etc.
    channel: string | 'created' | 'updated' | 'deleted' | 'system';
    metadata?: Record<string | number, any> | Diff;
}

export interface INotificationEvent {
    type: 'notification' | 'heartbeat' | 'connected' | 'error';
    data: INotification | string;
    notificationClass?: string;
    channel?: string
    userId?: number;
}

export type AiAssistantRole = 'user' | 'assistant';

export interface AiAssistantMessage {
    id: string;
    role: AiAssistantRole;
    content: string;
    timestamp: Date;
    modelId: string;
}

export interface AiAssistantModelInfo {
    id: string;
    name: string;
    description?: string;
}

/**
 * Streaming agent contract.
 *
 * A model service that only implements `generateReply` stays a plain chat
 * model; services that also implement the optional agent members below are
 * driven by the streaming UI (tool calls, reasoning, attachments, per-user
 * server-side session). See AbstractAiModelService.
 */

/** One SSE frame of a run. `type` drives how the UI folds it into the thread. */
export type AiAgentStreamEvent = {
    type: 'text.delta' | 'text.done' | 'reasoning.delta' | 'reasoning.done'
        | 'tool.start' | 'tool.done' | 'tool.error' | 'step.done' | 'turn.done'
        | 'done' | 'error' | string;
    [key: string]: unknown;
};

export type AiAgentPublish = (event: AiAgentStreamEvent) => void;

export interface AiAgentTokenUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

/** One selectable LLM inside an agent service. */
export interface AiAgentModelOption {
    id: string;
    contextWindow: number | null;
    maxOutputTokens: number | null;
    vision: boolean;
    /** Relative spend multiplier (×1 = median-priced model); null if unknown. */
    costCoefficient: number | null;
    [key: string]: unknown;
}

/** State of the user's server-side agent session. */
export interface AiAgentSessionMeta {
    model: string;
    contextWindow: number;
    vision: boolean;
    turns: number;
    contextTokens: number;
    totalUsage: AiAgentTokenUsage;
    [key: string]: unknown;
}

/**
 * Whether the service can talk to its LLM yet. Services that need no
 * provisioning simply omit `getConnectionStatus()` and are treated as ready.
 */
export interface AiAgentConnectionStatus {
    state: 'ready' | 'registering' | 'waiting_retry' | 'setup_required' | 'error';
    provider?: string;
    baseUrl?: string;
    source?: string | null;
    nextAttemptAt?: string | null;
    lastError?: string | null;
    expiresAt?: string | null;
    [key: string]: unknown;
}

/** States for which an agent can describe its connection screen. */
export type AiAgentConnectionState = Exclude<AiAgentConnectionStatus['state'], 'ready'>;

/**
 * Declarative connection screen supplied by an agent service. The shared panel
 * owns rendering, while the agent owns its copy, CTA and which status details
 * are useful to expose.
 */
export interface AiAgentConnectionScreen {
    title?: string;
    description?: string;
    icon?: 'spinner' | 'bot' | 'error';
    action?: {label: string; href: string};
    /** Status values the agent wants to render on this screen. */
    details?: Array<{
        field: string;
        label?: string;
        format?: 'text' | 'local-time';
        tone?: 'muted' | 'error';
    }>;
}

/** Normalized budget / rate limits of the provider key, when it exposes them. */
export interface AiAgentLimits {
    provider: string;
    supported: boolean;
    overBudget?: boolean;
    message?: string;
    maxBudgetUsd?: number | null;
    spentUsd?: number | null;
    remainingBudgetUsd?: number | null;
    budgetResetAt?: string | null;
    burstMaxBudgetUsd?: number | null;
    burstSpentUsd?: number | null;
    burstRemainingBudgetUsd?: number | null;
    burstResetAt?: string | null;
    burstDurationLabel?: string | null;
    rpmLimit?: number | null;
    tpmLimit?: number | null;
    fetchedAt?: string;
    [key: string]: unknown;
}

/**
 * Copy the panel shows instead of its neutral defaults. `getUiHints(locale)`
 * receives the admin user's locale, so agents can return localized copy.
 */
export interface AiAgentUiHints {
    title?: string;
    welcomeHint?: string;
    composerPlaceholder?: string;
    suggestions?: string[];
    /** Setting an operator must fill in before the service can connect. */
    setupSetting?: string;
    /** Where to fill it in; rendered as a button on the connection loader. */
    setupUrl?: string;
    /**
     * Per-state pages rendered while this agent is not ready. `default` is
     * used for any state without its own screen.
     */
    connectionScreens?: Partial<Record<AiAgentConnectionState | 'default', AiAgentConnectionScreen>>;
    [key: string]: unknown;
}

/** A browser-side capability which an agent may call through `ui.method`. */
export interface AiAgentUiMethod {
    id: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    action: string;
    accessRightsToken?: string;
}

/** Declarative UI contract consumed by the shared assistant panel. */
export interface AiAgentUiSchema extends AiAgentUiHints {
    commands: Array<{id: string; description?: string}>;
    uiMethods?: AiAgentUiMethod[];
    panels: {
        history: boolean;
        models: boolean;
        limits: boolean;
    };
}

/** An uploaded file as handed to the agent service (multer memory storage). */
export interface AiAgentUploadedFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

/** What the service reports back about a stored upload, if it stores them. */
export interface AiAgentSavedFile {
    id?: string;
    name?: string;
    [key: string]: unknown;
}
