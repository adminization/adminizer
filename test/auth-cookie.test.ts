import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/POWCaptcha", () => ({ POWCaptcha: class {} }));
vi.mock("password-hash", () => ({ default: { verify: () => true } }));
vi.mock("../src/lib/helper/jwt", () => ({ signUser: () => "test-session" }));
vi.mock("../src/helpers/inertiaAutHelper", () => ({ inertiaLoginHelper: () => ({}) }));
vi.mock("../src/lib/Adminizer", () => ({ Adminizer: { log: { warn: vi.fn() } } }));

import login from "../src/controllers/login";

afterEach(() => vi.unstubAllEnvs());

function context(action: "login" | "logout", secure = false) {
    const req: any = {
        secure, method: "POST", headers: {}, session: {},
        originalUrl: `/admin/model/User/${action}`,
        body: { login: "admin", password: "test" },
        adminizer: {
            jwtSecret: "test", config: { auth: { enable: true, captcha: false }, registration: {}, routePrefix: "/admin" },
            modelHandler: { internal: () => ({ get: () => ({ findOne: async () => ({ id: 1, login: "admin", isAdministrator: true }) }) }) },
            accessRightsHelper: { checkPermission: async () => true },
        },
    };
    let cookie = "";
    const res: any = { setHeader(_name: string, value: string) { cookie = value; }, redirect: vi.fn() };
    return { req, res, cookie: () => cookie };
}

describe("administrator session cookie transport", () => {
    it.each(["login", "logout"] as const)("%s marks session cookies Secure for a direct HTTPS request", async action => {
        vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("PUBLIC_SITE_ORIGIN", "");
        const ctx = context(action, true);
        await login(ctx.req, ctx.res);
        expect(ctx.cookie()).toContain("; Secure");
        expect(ctx.cookie()).toContain("; HttpOnly");
        expect(ctx.cookie()).toContain("; SameSite=Lax");
        expect(ctx.cookie()).toContain("; Path=/");
    });

    it.each(["login", "logout"] as const)("%s marks session cookies Secure for HTTPS terminated by the site's proxy", async action => {
        vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("PUBLIC_SITE_ORIGIN", "https://cbs-next.example");
        const ctx = context(action);
        await login(ctx.req, ctx.res);
        expect(ctx.cookie()).toContain("; Secure");
    });

    it("keeps production cookies Secure even without an explicit public origin", async () => {
        vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("PUBLIC_SITE_ORIGIN", "");
        const ctx = context("login");
        await login(ctx.req, ctx.res);
        expect(ctx.cookie()).toContain("; Secure");
    });

    it("allows plain HTTP development and does not trust an arbitrary forwarded header", async () => {
        vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("PUBLIC_SITE_ORIGIN", "");
        const ctx = context("login");
        ctx.req.headers["x-forwarded-proto"] = "https";
        await login(ctx.req, ctx.res);
        expect(ctx.cookie()).not.toContain("; Secure");
    });

    it("logout expires the same cookie at the same path", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const ctx = context("logout");
        await login(ctx.req, ctx.res);
        expect(ctx.cookie()).toMatch(/^adminizer_jwt=;/);
        expect(ctx.cookie()).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
        expect(ctx.cookie()).toContain("; Path=/");
    });
});
