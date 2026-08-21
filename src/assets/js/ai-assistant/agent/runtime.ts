import type {
  AttachmentAdapter,
  ChatModelAdapter,
  CompleteAttachment,
  PendingAttachment,
} from '@assistant-ui/react';
import { docAttachmentReferences } from './docs-attachment';

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type SessionMeta = {
  model: string;
  availableModels: Array<{
    id: string;
    contextWindow: number | null;
    maxOutputTokens: number | null;
    vision: boolean;
    /** Relative spend multiplier (×1 = median-priced model); null if unknown. */
    costCoefficient: number | null;
  }>;
  contextWindow: number;
  vision: boolean;
  turns: number;
  totalUsage: TokenUsage;
  contextTokens: number;
  maxFiles: number;
  maxFileSize: number;
};

/** What the backing model service actually implements (see `/status`). */
/** A slash command registered by the active AbstractAiModelService. */
export type AgentChatCommand = {
  id: string;
  description?: string;
};

/** Optional copy the model service wants shown instead of the neutral defaults. */
export type AgentUiHints = {
  title?: string | null;
  welcomeHint?: string | null;
  composerPlaceholder?: string | null;
  suggestions?: string[] | null;
  /** Setting the operator must fill in before the service can connect. */
  setupSetting?: string | null;
  /** Where to fill it in; rendered as a button on the connection loader. */
  setupUrl?: string | null;
  /** Agent-defined pages for states before it is ready. */
  connectionScreens?: Partial<Record<ConnectionState | 'default', ConnectionScreen>> | null;
};

type ConnectionState = 'registering' | 'waiting_retry' | 'setup_required' | 'error';

export type ConnectionScreen = {
  title?: string | null;
  description?: string | null;
  icon?: 'spinner' | 'bot' | 'error' | null;
  action?: {label: string; href: string} | null;
  details?: Array<{
    field: string;
    label?: string | null;
    format?: 'text' | 'local-time';
    tone?: 'muted' | 'error';
  }> | null;
};

export type AgentUiSchema = AgentUiHints & {
  commands: AgentChatCommand[];
  uiMethods?: Array<{
    id: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    action: string;
  }>;
  panels: {
    history: boolean;
    models: boolean;
    limits: boolean;
  };
};

export type ConnectionStatus = {
  state: 'ready' | ConnectionState;
  provider?: string;
  baseUrl?: string;
  source?: string | null;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  expiresAt?: string | null;
  /** Admin UI language for the bundled i18n dictionaries. */
  locale?: string | null;
  schema?: AgentUiSchema;
  [key: string]: unknown;
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type LlmBudgetWindow = {
  kind: 'daily' | 'burst';
  durationLabel: string;
  durationSeconds: number | null;
  maxBudgetUsd: number;
  spentUsd: number | null;
  remainingBudgetUsd: number | null;
  resetAt: string | null;
};

/**
 * Normalized limits payload. Everything past `supported` is optional: a
 * provider that exposes nothing answers `{supported: false}` and the panel
 * simply says so.
 */
export type LlmLimits = {
  provider: string;
  supported: boolean;
  overBudget?: boolean;
  message?: string;
  userId?: string | null;
  keyAlias?: string | null;
  maxBudgetUsd?: number | null;
  spentUsd?: number | null;
  remainingBudgetUsd?: number | null;
  budgetResetAt?: string | null;
  /** Tighter short window (e.g. 4h): cap + reset only; spend is not exposed. */
  burstMaxBudgetUsd?: number | null;
  burstSpentUsd?: number | null;
  burstRemainingBudgetUsd?: number | null;
  burstResetAt?: string | null;
  burstDurationLabel?: string | null;
  windows?: LlmBudgetWindow[];
  rpmLimit?: number | null;
  tpmLimit?: number | null;
  fetchedAt?: string;
};

/**
 * Base URL of the agent transport, e.g. `/admin/api/ai-assistant/agent/my-model`.
 * The panel host sets it once (route prefix + active model id) before the first
 * request, so this module stays free of both routing and Inertia.
 */
let apiBase = '';

export function setApiBase(base: string): void {
  apiBase = base.replace(/\/+$/, '');
}

export function basePath(): string {
  return apiBase;
}

function getCsrfToken(): string | null {
  for (const entry of document.cookie.split(';')) {
    const [rawName, ...rawValue] = entry.trim().split('=');
    if (rawName === 'XSRF-TOKEN') return decodeURIComponent(rawValue.join('=') || '');
  }
  return null;
}

function csrfHeaders(): HeadersInit {
  const token = getCsrfToken();
  return token ? { 'X-XSRF-TOKEN': token } : {};
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function fetchStatus(): Promise<ConnectionStatus> {
  const response = await fetch(`${basePath()}/status`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function fetchLimits(forceRefresh = false): Promise<LlmLimits> {
  // An explicit refresh asks the service to re-read the provider live (past any
  // short cache of its own), so spend and window reset times are current.
  const query = forceRefresh ? '?refresh=1' : '';
  const response = await fetch(`${basePath()}/limits${query}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function fetchMeta(): Promise<SessionMeta> {
  const response = await fetch(`${basePath()}/meta`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function setModel(model: string): Promise<SessionMeta> {
  const response = await fetch(`${basePath()}/model`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify({ model }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

// ── Dialog restore from the server session ───────────────────────────
// The server session is the source of truth: on page load the UI pulls its
// ai-sdk message history and rebuilds the thread from it. When the server
// restarts, both the visible dialog and the agent context reset together.

export async function fetchHistory(): Promise<any[]> {
  const response = await fetch(`${basePath()}/history`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return Array.isArray(data?.messages) ? data.messages : [];
}

export async function fetchConversations(): Promise<{activeId: string; conversations: ConversationSummary[]}> {
  const response = await fetch(`${basePath()}/conversations`, {
    credentials: 'same-origin',
    headers: {Accept: 'application/json'},
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return {
    activeId: typeof data?.activeId === 'string' ? data.activeId : '',
    conversations: Array.isArray(data?.conversations) ? data.conversations : [],
  };
}

export async function createConversation(): Promise<ConversationSummary> {
  const response = await fetch(`${basePath()}/conversations`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {Accept: 'application/json', ...csrfHeaders()},
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return data.conversation as ConversationSummary;
}

export async function selectConversation(conversationId: string): Promise<ConversationSummary> {
  const response = await fetch(`${basePath()}/conversations/${encodeURIComponent(conversationId)}/select`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {Accept: 'application/json', ...csrfHeaders()},
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return data.conversation as ConversationSummary;
}

/** `<attachment name="...">` text blobs are shown as a short chip-like note. */
function userPartsFrom(content: any): any[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  const parts: any[] = [];
  for (const part of content ?? []) {
    if (part?.type === 'text') {
      const attachment = /^<attachment name=("(?:[^"\\]|\\.)*")/.exec(part.text ?? '');
      if (attachment) {
        let name = 'file';
        try { name = JSON.parse(attachment[1]); } catch { /* keep default */ }
        parts.push({ type: 'text', text: `📎 ${name}` });
      } else {
        parts.push({ type: 'text', text: part.text ?? '' });
      }
    } else if (part?.type === 'image' && typeof part.image === 'string') {
      parts.push({ type: 'image', image: part.image });
    }
  }
  return parts.length ? parts : [{ type: 'text', text: '' }];
}

/**
 * ai-sdk ModelMessage[] → assistant-ui ThreadMessageLike[]. Consecutive
 * assistant/tool messages (steps of one turn) are merged into a single
 * assistant message with ordered text / reasoning / tool-call parts, matching
 * how the live stream renders.
 */
export function historyToThreadMessages(messages: any[]): any[] {
  const result: any[] = [];
  const toolCalls = new Map<string, any>();
  let assistantParts: any[] | null = null;
  const flushAssistant = () => {
    if (assistantParts?.length) result.push({ role: 'assistant', content: assistantParts });
    assistantParts = null;
  };

  for (const message of messages ?? []) {
    if (message?.role === 'user') {
      flushAssistant();
      result.push({ role: 'user', content: userPartsFrom(message.content) });
    } else if (message?.role === 'assistant') {
      if (!assistantParts) assistantParts = [];
      const content = typeof message.content === 'string'
        ? [{ type: 'text', text: message.content }]
        : (message.content ?? []);
      for (const part of content) {
        if (part?.type === 'text' && part.text) {
          assistantParts.push({ type: 'text', text: part.text });
        } else if (part?.type === 'reasoning' && part.text) {
          assistantParts.push({ type: 'reasoning', text: part.text });
        } else if (part?.type === 'tool-call') {
          const call = {
            type: 'tool-call',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            args: part.input ?? part.args ?? {},
          };
          toolCalls.set(part.toolCallId, call);
          assistantParts.push(call);
        }
      }
    } else if (message?.role === 'tool') {
      for (const part of message.content ?? []) {
        if (part?.type !== 'tool-result') continue;
        const call = toolCalls.get(part.toolCallId);
        if (!call) continue;
        const output = part.output ?? part.result;
        call.result = output && typeof output === 'object' && 'type' in output && 'value' in output
          ? output.value
          : output;
      }
    }
    // system messages are internal — never shown
  }
  flushAssistant();
  return result;
}

type AgentEvent = Record<string, any> & { type: string };

/**
 * Consumes the buffered SSE run stream as an async iterator. EventSource
 * reconnects transparently; the server resumes from Last-Event-ID, so no
 * event is delivered twice.
 */
async function* sseEvents(url: string, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
  const source = new EventSource(url, { withCredentials: true });
  const queue: AgentEvent[] = [];
  let notify: (() => void) | null = null;
  let finished = false;
  const wake = () => { notify?.(); notify = null; };

  source.addEventListener('agent', (event: MessageEvent) => {
    try { queue.push(JSON.parse(event.data)); } catch { /* ignore malformed */ }
    wake();
  });
  source.onerror = () => {
    // CLOSED means the browser gave up (no auto-reconnect); CONNECTING is a
    // transparent retry and the server will resume via Last-Event-ID.
    if (source.readyState === EventSource.CLOSED) { finished = true; wake(); }
  };
  const onAbort = () => { finished = true; wake(); };
  signal?.addEventListener('abort', onAbort);

  try {
    while (true) {
      while (queue.length) {
        const event = queue.shift()!;
        yield event;
        if (event.type === 'done' || event.type === 'error') return;
      }
      if (finished || signal?.aborted) return;
      await new Promise<void>((resolve) => { notify = resolve; });
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    source.close();
  }
}

type AdapterCallbacks = {
  onUsage?: (usage: TokenUsage) => void;
  onRunEnd?: () => void;
};

/**
 * ChatModelAdapter for the agent transport. Conversation history lives in
 * the server-side Session, so only the newest user message (plus attachment
 * files) is submitted; the SSE events are folded into an ordered list of
 * text / reasoning / tool-call parts.
 */
export function createAgentAdapter({ onUsage, onRunEnd }: AdapterCallbacks): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const last = messages[messages.length - 1];
      if (!last || last.role !== 'user') throw new Error('Nothing to send.');

      const text = last.content
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('\n\n');

      // Attached documents carry no file: their reference is the text part of
      // the attachment, and it leads the message so the agent knows what to
      // read before it reads the question.
      const attachments = last.attachments ?? [];
      const message = [...docAttachmentReferences(attachments), text]
        .filter((part) => part.trim() !== '')
        .join('\n\n');

      const form = new FormData();
      form.append('message', message);
      for (const attachment of attachments) {
        const file = (attachment as { file?: File }).file;
        if (file) form.append('files', file, attachment.name);
      }

      const started = await fetch(`${basePath()}/runs`, {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...csrfHeaders() },
        signal: abortSignal,
      });
      if (!started.ok) throw new Error(await readError(started));
      const { stream } = await started.json();

      type Part = Record<string, any> & { type: string };
      const parts: Part[] = [];
      const toolParts = new Map<string, Part>();
      let textPart: Part | null = null;
      let reasoningPart: Part | null = null;
      const snapshot = () => ({ content: parts.map((part) => ({ ...part })) as any });

      try {
        for await (const event of sseEvents(stream, abortSignal)) {
          switch (event.type) {
            case 'text.delta': {
              if (!textPart) { textPart = { type: 'text', text: '' }; parts.push(textPart); reasoningPart = null; }
              textPart.text += event.text ?? '';
              yield snapshot();
              break;
            }
            case 'text.done': textPart = null; break;
            case 'reasoning.delta': {
              if (!reasoningPart) { reasoningPart = { type: 'reasoning', text: '' }; parts.push(reasoningPart); textPart = null; }
              reasoningPart.text += event.text ?? '';
              yield snapshot();
              break;
            }
            case 'reasoning.done': reasoningPart = null; break;
            case 'tool.start': {
              const part: Part = {
                type: 'tool-call',
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: event.input ?? {},
                argsText: JSON.stringify(event.input ?? {}, null, 2),
              };
              toolParts.set(event.toolCallId, part);
              parts.push(part);
              textPart = null; reasoningPart = null;
              yield snapshot();
              break;
            }
            case 'tool.done': {
              const part = toolParts.get(event.toolCallId);
              if (part) { part.result = event.output; yield snapshot(); }
              break;
            }
            case 'tool.error': {
              const part = toolParts.get(event.toolCallId);
              if (part) { part.result = event.error ?? 'Tool call failed'; part.isError = true; yield snapshot(); }
              break;
            }
            case 'ui.method': {
              executeUiMethod(event);
              break;
            }
            case 'step.done':
            case 'turn.done': {
              if (event.usage) onUsage?.(event.usage);
              break;
            }
            case 'error':
              throw new Error(typeof event.error === 'string' ? event.error : 'Agent run failed');
            case 'done':
              return;
            default:
              break;
          }
        }
      } finally {
        onRunEnd?.();
      }
    },
  };
}

/**
 * Normalizes a link for this admin panel. Agents (and the LLM text they write)
 * routinely guess an origin — dropping the dev port — or omit the route prefix,
 * so only the path is trusted: an admin path is always resolved against the
 * current origin, and a missing prefix is added back.
 *
 * Returns `internal: false` for anything that belongs to another site, which is
 * then left exactly as written.
 */
export function resolveAdminHref(value: string): { href: string; internal: boolean } {
  const raw = (value ?? '').trim();
  const prefix = (window.routePrefix || '').replace(/\/+$/, '');
  const inPanel = (path: string) => Boolean(prefix) && (path === prefix || path.startsWith(`${prefix}/`));
  if (!raw) return { href: raw, internal: false };

  // mailto:, tel:, data: and in-page anchors are none of our business.
  if (raw.startsWith('#') || (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw))) {
    return { href: raw, internal: false };
  }

  let path = raw;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
    let url: URL;
    try {
      url = new URL(raw.startsWith('//') ? `${window.location.protocol}${raw}` : raw);
    } catch {
      return { href: raw, internal: false };
    }
    // The port is compared away on purpose: a guessed `http://localhost/...`
    // still means this panel, and keeping the origin would open a new window on
    // a server that is not listening there.
    const currentHost = (window.location.hostname || window.location.host || '').replace(/:\d+$/, '');
    if (url.hostname !== currentHost && !inPanel(url.pathname)) {
      return { href: raw, internal: false };
    }
    path = `${url.pathname}${url.search}${url.hash}`;
  }

  if (!path.startsWith('/')) path = `/${path}`;
  if (prefix && !inPanel(path.split(/[?#]/)[0])) path = `${prefix}${path}`;
  return { href: path, internal: true };
}

/**
 * Opens an admin path through the router of the page. The panel bundle cannot
 * import Inertia itself (its react-dom is a window shim), so it uses the
 * instance the main bundle publishes and falls back to a full page load.
 */
export function visitAdminHref(href: string): void {
  const router = window.InertiajsReact?.router;
  if (router) router.visit(href);
  else window.location.assign(href);
}

/** Executes only the two built-in browser methods. App-defined actions are
 * deliberately ignored here until their frontend bundle registers an executor. */
function executeUiMethod(event: AgentEvent): void {
  const input = event.input && typeof event.input === 'object' ? event.input : {};
  if (event.action === 'navigate') {
    const target = resolveAdminHref(typeof input.href === 'string' ? input.href : '');
    if (target.internal) visitAdminHref(target.href);
    return;
  }
  if (event.action === 'search-admin-links') {
    window.dispatchEvent(new CustomEvent('adminizer:ai-search-admin-links', {detail: input}));
  }
}

const TEXT_ACCEPT = [
  'text/*', 'application/json',
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.html', '.css',
  '.js', '.ts', '.jsx', '.tsx', '.sql', '.log', '.ini', '.conf', '.sh', '.graphql',
].join(',');

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Keeps the original File on the attachment (the chat adapter uploads it as
 * multipart form data); images additionally get a data-URL content part so
 * the chat UI can render thumbnails and previews.
 */
export class AgentAttachmentAdapter implements AttachmentAdapter {
  constructor(private readonly getMeta: () => SessionMeta | null) {}

  get accept(): string {
    return '*';
  }

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    const maxFileSize = this.getMeta()?.maxFileSize ?? 8 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new Error(`File is too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`);
    }
    return {
      id: crypto.randomUUID(),
      type: file.type.startsWith('image/') ? 'image' : 'document',
      name: file.name,
      contentType: file.type || 'application/octet-stream',
      file,
      status: { type: 'requires-action', reason: 'composer-send' },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const content =
      attachment.type === 'image'
        ? [{ type: 'image' as const, image: await fileToDataURL(attachment.file) }]
        : [];
    return { ...attachment, status: { type: 'complete' }, content };
  }

  async remove(): Promise<void> {}
}
