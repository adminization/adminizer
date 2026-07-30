import {AiAgentStreamEvent} from '../../interfaces/types';

/** Runs are kept only long enough for a reconnecting EventSource to catch up. */
const MAX_RUN_AGE_MS = 10 * 60 * 1000;
/** Hard cap per SSE frame, so a chatty tool result cannot blow up memory. */
const MAX_EVENT_JSON_CHARS = 64 * 1024;

interface AgentRun {
    id: string;
    userId: number;
    modelId: string;
    createdAt: number;
    events: AiAgentStreamEvent[];
    clients: Set<ResType>;
    done: boolean;
}

/**
 * Buffered SSE transport for agent runs.
 *
 * A run is started by a POST that returns immediately (so the browser can open
 * the stream) and then writes its events here. Every event is stored with its
 * index and used as the SSE event id, which lets EventSource resume through
 * `Last-Event-ID` after a reconnect without replaying what the client already
 * processed.
 */
export class AiAgentRunManager {
    private readonly runs = new Map<string, AgentRun>();

    create(userId: number, modelId: string): AgentRun {
        this.cleanup();
        const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const run: AgentRun = {
            id,
            userId,
            modelId,
            createdAt: Date.now(),
            events: [],
            clients: new Set<ResType>(),
            done: false,
        };
        this.runs.set(id, run);
        return run;
    }

    /** Only the owner may read a run. */
    get(runId: string, userId: number): AgentRun | undefined {
        const run = this.runs.get(runId);
        return run && run.userId === userId ? run : undefined;
    }

    publish(run: AgentRun, event: AiAgentStreamEvent): void {
        const safe = this.sanitize(event);
        const index = run.events.push(safe) - 1;
        for (const client of run.clients) this.write(client, 'agent', safe, index);
    }

    /** Marks the run finished and flushes the closing frame to every client. */
    finish(run: AgentRun, event: AiAgentStreamEvent): void {
        run.done = true;
        this.publish(run, event);
        for (const client of run.clients) client.end();
        run.clients.clear();
    }

    /** Streams a run to one client: replays what it missed, then follows live. */
    subscribe(run: AgentRun, req: ReqType, res: ResType): void {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();
        res.write('retry: 3000\n\n');
        this.write(res, 'connected', {runId: run.id});

        const lastEventId = Number(req.headers['last-event-id']);
        const start = Number.isFinite(lastEventId) ? lastEventId + 1 : 0;
        for (let i = start; i < run.events.length; i++) {
            this.write(res, 'agent', run.events[i], i);
        }

        if (run.done) {
            res.end();
            return;
        }

        run.clients.add(res);
        req.on('close', () => run.clients.delete(res));
    }

    private write(res: ResType, event: string, data: unknown, id?: number): void {
        if (id !== undefined) res.write(`id: ${id}\n`);
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    /** SSE payloads must be JSON-safe and bounded. */
    private sanitize(event: AiAgentStreamEvent): AiAgentStreamEvent {
        if (!event || typeof event !== 'object') return event;

        let safe: AiAgentStreamEvent = event;
        // A finished agent turn may carry the whole history — the panel never
        // uses it and it would dwarf every other frame.
        if (safe.type === 'done' && 'messages' in safe) {
            const {messages: _messages, ...rest} = safe as Record<string, unknown>;
            safe = rest as AiAgentStreamEvent;
        }
        if (safe.error instanceof Error) {
            safe = {...safe, error: safe.error.message};
        }

        const json = JSON.stringify(safe);
        if (json.length <= MAX_EVENT_JSON_CHARS) return safe;

        return {
            type: safe.type || 'event',
            truncated: true,
            originalChars: json.length,
            message: `${safe.type || 'event'} payload was truncated to keep SSE memory bounded.`,
            preview: `${json.slice(0, MAX_EVENT_JSON_CHARS - 1)}…`,
        };
    }

    private cleanup(): void {
        const cutoff = Date.now() - MAX_RUN_AGE_MS;
        for (const [id, run] of this.runs) {
            if (run.createdAt < cutoff) this.runs.delete(id);
        }
    }
}

export type {AgentRun};
