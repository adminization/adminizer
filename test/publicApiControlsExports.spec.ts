import { describe, it, expect } from 'vitest';
import {
    AbstractControls,
    ControlsHandler,
} from '../src';
import inertiaExpressAdapter from '../src/lib/inertia/inertiaAdapter';

describe('Public API: controls exports', () => {
    it('AbstractControls is exported', () => {
        expect(AbstractControls).toBeDefined();
    });

    it('ControlsHandler is exported', () => {
        expect(ControlsHandler).toBeDefined();
    });

    it('inertiaExpressAdapter is exported', () => {
        expect(inertiaExpressAdapter).toBeDefined();
        expect(typeof inertiaExpressAdapter).toBe('function');
    });
});

describe('_skipCSRF flag', () => {
    const makeMiddleware = () =>
        inertiaExpressAdapter({
            version: '1',
            html: () => '',
            csrf: { enabled: true },
        });

    function makeRes() {
        const headers: Record<string, any> = {};
        let statusCode = 200;
        let jsonBody: any;
        const res: any = {
            cookie: () => res,
            status: (code: number) => { statusCode = code; return res; },
            json: (body: any) => { jsonBody = body; return res; },
            set: () => res,
            send: () => res,
            writeHead: () => res,
            end: () => res,
            getStatusCode: () => statusCode,
            getJsonBody: () => jsonBody,
        };
        return res;
    }

    it('blocks POST without CSRF token when _skipCSRF is not set', async () => {
        const middleware = makeMiddleware();
        const req: any = {
            method: 'POST',
            path: '/admin/some-action',
            headers: {},
            cookies: {},
            adminizer: { config: { cors: { enabled: false } } },
            session: {},
        };
        const res = makeRes();
        let nextCalled = false;

        await new Promise<void>((resolve) => {
            middleware(req, res, () => { nextCalled = true; resolve(); });
            // if next not called, resolve via status check
            if (!nextCalled) resolve();
        });

        expect(nextCalled).toBe(false);
        expect(res.getStatusCode()).toBe(403);
        expect(res.getJsonBody()).toMatchObject({ type: 'csrf_error' });
    });

    it('allows POST when _skipCSRF is true, skipping CSRF check', async () => {
        const middleware = makeMiddleware();
        const req: any = {
            method: 'POST',
            path: '/admin/some-action',
            headers: {},
            cookies: {},
            _skipCSRF: true,
            adminizer: { config: { cors: { enabled: false } } },
            session: {},
        };
        const res = makeRes();
        let nextCalled = false;

        await new Promise<void>((resolve) => {
            middleware(req, res, () => { nextCalled = true; resolve(); });
        });

        expect(nextCalled).toBe(true);
    });

    it('allows GET without CSRF regardless of _skipCSRF', async () => {
        const middleware = makeMiddleware();
        const req: any = {
            method: 'GET',
            path: '/admin/page',
            headers: {},
            cookies: {},
            adminizer: { config: { cors: { enabled: false } } },
            session: {},
        };
        const res = makeRes();
        let nextCalled = false;

        await new Promise<void>((resolve) => {
            middleware(req, res, () => { nextCalled = true; resolve(); });
        });

        expect(nextCalled).toBe(true);
    });
});
