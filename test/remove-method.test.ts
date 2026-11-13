import { describe, expect, it, vi } from "vitest";

vi.mock("../src/helpers/controllerHelper", () => ({ ControllerHelper: { findModelResource: (req: any) => req.resource } }));
vi.mock("../src/lib/DataAccessor", () => ({ DataAccessor: class {} }));
vi.mock("../src/lib/Adminizer", () => ({ Adminizer: { log: { error: vi.fn() } } }));
vi.mock("../src/lib/media-manager/helpers/MediaManagerHelper", () => ({ deleteRelationsMediaManager: vi.fn() }));

import remove from "../src/controllers/remove";
import inertia from "../src/lib/inertia/inertiaAdapter";
import { requireAuthUI, requirePermission } from "../src/policies/authPolicies";

function fixture(method: string, validToken = true, allowed = true) {
    const records = new Map([["1", { id: "1", title: "Test record" }]]);
    const model = {
        findOne: vi.fn(async () => records.get("1")),
        destroy: vi.fn(async () => { const row = records.get("1"); records.delete("1"); return [row]; }),
    };
    const req: any = {
        method, headers: validToken ? { "x-xsrf-token": "test-csrf" } : {}, cookies: { "XSRF-TOKEN": "test-csrf" },
        params: { id: "1" }, query: { referTo: "" }, path: "/admin/model/QuoteModel/remove/1", originalUrl: "/admin/model/QuoteModel/remove/1",
        user: { id: 1 }, flash: { setFlashMessage: vi.fn() }, i18n: { __: (value: string) => value },
        resource: { model, name: "QuoteModel", config: { remove: true, identifierField: "id" }, uri: "/admin/model/QuoteModel" },
        adminizer: { config: { auth: { enable: true }, routePrefix: "/admin" }, accessRightsHelper: { checkPermission: async () => allowed } },
        accepts: () => false,
    };
    const res: any = {
        statusCode: 200, headers: {},
        set(name: string, value: string) { this.headers[name] = value; return this; },
        status(code: number) { this.statusCode = code; return this; },
        sendStatus(code: number) { this.statusCode = code; return this; },
        cookie: vi.fn(), json: vi.fn(), send: vi.fn(),
        redirect(code: number) { this.statusCode = code; return this; },
    };
    async function dispatch() {
        const middleware = inertia({ version: "1", html: () => "", csrf: { enabled: true } });
        await middleware(req, res, async () => {
            await requireAuthUI()(req, res, async () => {
                await requirePermission("delete-quotemodel-model", { mode: "ui" })(req, res, async () => { await remove(req, res); });
            });
        });
    }
    return { records, model, req, res, dispatch };
}

describe("record removal methods and CSRF", () => {
    it.each(["GET", "HEAD", "OPTIONS", "PUT", "PATCH"])("%s never mutates a record", async method => {
        const ctx = fixture(method);
        await ctx.dispatch();
        expect(ctx.res.statusCode).toBe(405);
        expect(ctx.res.headers.Allow).toBe("POST, DELETE");
        expect(ctx.records.has("1")).toBe(true);
        expect(ctx.model.destroy).not.toHaveBeenCalled();
    });

    it.each(["POST", "DELETE"])("%s with valid CSRF and permission removes the record", async method => {
        const ctx = fixture(method);
        await ctx.dispatch();
        expect(ctx.records.has("1")).toBe(false);
        expect(ctx.model.destroy).toHaveBeenCalledTimes(1);
        expect([302, 303]).toContain(ctx.res.statusCode);
    });

    it.each(["POST", "DELETE"])("%s without CSRF is denied without deleting", async method => {
        const ctx = fixture(method, false);
        await ctx.dispatch();
        expect(ctx.res.statusCode).toBe(403);
        expect(ctx.records.has("1")).toBe(true);
        expect(ctx.model.destroy).not.toHaveBeenCalled();
    });

    it("POST by a user without deletion permission does not delete", async () => {
        const ctx = fixture("POST", true, false);
        await ctx.dispatch();
        expect(ctx.res.statusCode).toBe(403);
        expect(ctx.records.has("1")).toBe(true);
        expect(ctx.model.destroy).not.toHaveBeenCalled();
    });
});
