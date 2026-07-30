import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://lllm.m42.cx/v1';
const IDLE_RECHECK_MS = 60_000;
const NETWORK_RETRY_MS = 60_000;
const HARD_ERROR_RETRY_MS = 5 * 60_000;
const EXPIRY_SLACK_MS = 60_000;

export type OpenHarnessCredentials = {
    apiKey: string;
    baseUrl: string;
    source: 'env' | 'broker';
    userId: string | null;
};

type BrokerState = {
    apiKey?: string;
    userId?: string;
    baseUrl?: string;
    expiresAt?: string;
};

/**
 * Fixture counterpart of RestoApp's connection manager. It retains the broker
 * flow and retry behaviour, but stores its state locally because fixture has
 * no Settings model. Environment is deliberately its only configuration API.
 */
export class OpenHarnessConnectionManager {
    private credentials: OpenHarnessCredentials | null = null;
    private state: 'ready' | 'registering' | 'waiting_retry' | 'setup_required' | 'error' = 'registering';
    private lastError: string | null = null;
    private nextAttemptAt: number | null = null;
    private expiresAt: string | null = null;
    private timer: NodeJS.Timeout | null = null;
    private resolving: Promise<void> | null = null;
    private readonly listeners: Array<() => void> = [];
    private readonly statePath = process.env.OPENHARNESS_BROKER_STATE_FILE
        ?? path.resolve(process.cwd(), '.tmp/openharness-fixture/broker-state.json');

    public onChange(listener: () => void): void { this.listeners.push(listener); }
    public getCredentialsSync(): OpenHarnessCredentials | null { return this.credentials; }
    public isReady(): boolean { return this.state === 'ready' && this.credentials !== null; }

    public getStatus() {
        return {
            state: this.state,
            provider: 'litellm',
            baseUrl: this.credentials?.baseUrl ?? this.baseUrl,
            source: this.credentials?.source ?? null,
            nextAttemptAt: this.nextAttemptAt ? new Date(this.nextAttemptAt).toISOString() : null,
            lastError: this.lastError,
            expiresAt: this.expiresAt,
        };
    }

    public async refresh() {
        if (!this.resolving) this.resolving = this.resolve().finally(() => { this.resolving = null; });
        await this.resolving;
        return this.getStatus();
    }

    public async reportAuthFailure(): Promise<void> {
        if (this.credentials?.source !== 'broker') return;
        await this.saveState({});
        this.credentials = null;
        this.state = 'registering';
        this.schedule(0);
    }

    private get baseUrl(): string { return (process.env.OPENHARNESS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''); }
    private get projectName(): string { return (process.env.PROJECT_NAME || '').trim(); }
    private get frontendId(): string { return (process.env.OPENHARNESS_FRONTEND_ID || `adminizer-fixture:${this.projectName}`).trim(); }
    private get models(): string[] { return (process.env.OPENHARNESS_REGISTER_MODELS || process.env.OPENHARNESS_MODEL || 'grs-base-regular').split(',').map((value) => value.trim()).filter(Boolean); }

    private async resolve(): Promise<void> {
        const previousKey = this.credentials?.apiKey ?? null;
        const envKey = (process.env.OPENHARNESS_API_KEY || '').trim();
        if (envKey) {
            this.setReady({apiKey: envKey, baseUrl: this.baseUrl, source: 'env', userId: null}, previousKey);
            return;
        }

        const stored = await this.readState();
        if (stored.apiKey && !this.expired(stored.expiresAt)) {
            this.expiresAt = stored.expiresAt ?? null;
            this.setReady({apiKey: stored.apiKey, baseUrl: stored.baseUrl || this.baseUrl, source: 'broker', userId: stored.userId ?? null}, previousKey);
            if (stored.expiresAt) this.schedule(Math.max(Date.parse(stored.expiresAt) - EXPIRY_SLACK_MS - Date.now(), IDLE_RECHECK_MS), true);
            return;
        }

        this.credentials = null;
        this.expiresAt = null;
        if (!this.projectName) {
            this.state = 'setup_required';
            this.lastError = 'PROJECT_NAME is not set. Set it to register the OpenHarness fixture agent.';
            this.schedule(IDLE_RECHECK_MS, true);
            return;
        }
        await this.register(previousKey);
    }

    private async register(previousKey: string | null): Promise<void> {
        if (this.nextAttemptAt && this.nextAttemptAt - Date.now() > 1_000) { this.state = 'waiting_retry'; return; }
        this.state = 'registering';
        try {
            const headers: Record<string, string> = {'Content-Type': 'application/json', Accept: 'application/json'};
            const brokerToken = (process.env.OPENHARNESS_BROKER_TOKEN || '').trim();
            if (brokerToken) headers.Authorization = `Bearer ${brokerToken}`;
            const response = await fetch(`${this.baseUrl}/frontend/register`, {
                method: 'POST', headers,
                body: JSON.stringify({frontend_id: this.frontendId, project_name: this.projectName, models: this.models}),
            });
            const body: any = await response.json().catch(() => ({}));
            if (response.ok && body?.api_key) {
                const state: BrokerState = {apiKey: body.api_key, userId: body.user_id, baseUrl: body.base_url || this.baseUrl, expiresAt: body.expires_at};
                await this.saveState(state);
                this.expiresAt = state.expiresAt ?? null;
                this.setReady({apiKey: state.apiKey!, baseUrl: state.baseUrl!, source: 'broker', userId: state.userId ?? null}, previousKey);
                return;
            }
            if (response.status === 429) {
                const retryAt = Date.parse(body?.details?.retry_after_at ?? '');
                const retrySeconds = Number(body?.details?.retry_after_seconds);
                const delay = Number.isFinite(retryAt) ? Math.max(retryAt - Date.now(), 5_000) : Number.isFinite(retrySeconds) ? Math.max(retrySeconds * 1_000, 5_000) : NETWORK_RETRY_MS;
                this.state = 'waiting_retry'; this.lastError = body?.message || 'Broker key issue rate limited'; this.schedule(delay); return;
            }
            this.state = 'error'; this.lastError = body?.message || body?.error || `Broker registration failed with HTTP ${response.status}`; this.schedule(HARD_ERROR_RETRY_MS);
        } catch (error: any) {
            this.state = 'error'; this.lastError = error?.message || 'Broker is unreachable'; this.schedule(NETWORK_RETRY_MS);
        }
    }

    private setReady(credentials: OpenHarnessCredentials, previousKey: string | null): void {
        this.credentials = credentials; this.state = 'ready'; this.lastError = null; this.nextAttemptAt = null;
        if (credentials.source !== 'broker') this.expiresAt = null;
        if (previousKey !== credentials.apiKey) this.listeners.forEach((listener) => listener());
    }

    private schedule(delay: number, silent = false): void {
        if (this.timer) clearTimeout(this.timer);
        this.nextAttemptAt = silent ? this.nextAttemptAt : Date.now() + delay;
        this.timer = setTimeout(() => { this.nextAttemptAt = null; void this.refresh(); }, Math.max(delay, 1_000));
        this.timer.unref?.();
    }

    private async readState(): Promise<BrokerState> {
        try { return JSON.parse(await readFile(this.statePath, 'utf8')) as BrokerState; } catch { return {}; }
    }
    private async saveState(state: BrokerState): Promise<void> {
        await mkdir(path.dirname(this.statePath), {recursive: true});
        await writeFile(this.statePath, JSON.stringify(state), {mode: 0o600});
    }
    private expired(expiresAt?: string): boolean {
        const timestamp = Date.parse(expiresAt ?? '');
        return Number.isFinite(timestamp) && timestamp - EXPIRY_SLACK_MS <= Date.now();
    }
}
