import express from "express";
import type {AddressInfo} from "net";
import {afterEach, describe, expect, it} from "vitest";
import bindReqFunctions from "../src/system/bindReqFunctions";
import login from "../src/controllers/login";
import {signUser} from "../src/lib/helper/jwt";

const SECRET = "test-secret";

type TestUser = {id: number; login: string; isAdministrator: boolean};

/**
 * Adminizer's auth wiring without `express-session`: the pretended user has to survive
 * without a session, the way it must behind a proxy that terminates https (the session
 * cookie is not issued there). The `adminizer_jwt` cookie stays the same throughout.
 */
async function start(users: TestUser[]) {
    const app = express();
    app.use(express.urlencoded({extended: true}));
    app.use(express.json());

    const findOne = async ({where}: {where: Partial<TestUser>}) =>
        users.find((user) =>
            Object.entries(where).every(([key, value]) => user[key as keyof TestUser] === value)) ?? null;

    const adminizer = {
        app,
        jwtSecret: SECRET,
        config: {routePrefix: "/admin", translation: false, auth: {enable: true, captcha: false}},
        appManager: {createRuntime: () => ({})},
        modelHandler: {internal: () => ({get: () => ({findOne})})},
    };
    bindReqFunctions(adminizer as never);

    app.all("/admin/model/User/login", (req, res) => login(req as never, res as never));
    app.all("/admin/model/User/logout", (req, res) => login(req as never, res as never));
    app.get("/admin/whoami", (req, res) => res.json({login: (req as never as {user?: TestUser}).user?.login ?? null}));

    const server = await new Promise<import("http").Server>((resolve) => {
        const listening = app.listen(0, () => resolve(listening));
    });
    servers.push(server);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    /** A browser reduced to its cookie jar. */
    let cookie = "";
    const call = async (path: string, body?: Record<string, unknown>) => {
        const response = await fetch(base + path, {
            method: body ? "POST" : "GET",
            redirect: "manual",
            headers: {"content-type": "application/json", cookie},
            body: body ? JSON.stringify(body) : undefined,
        });
        const setCookie = response.headers.getSetCookie().find((value) => value.startsWith("adminizer_jwt="));
        if (setCookie) cookie = setCookie.split(";")[0];
        return response;
    };
    /** `issuedAt` tells two logins of the same user apart: each gets its own token. */
    const loginAs = (user: TestUser, issuedAt = ++logins) => {
        cookie = `adminizer_jwt=${signUser({...user, iat: Math.floor(Date.now() / 1000) - issuedAt}, SECRET)}`;
        return cookie;
    };
    const useCookie = (value: string) => {
        cookie = value;
    };
    const whoami = async () => (await (await call("/admin/whoami")).json()).login;

    return {call, loginAs, useCookie, whoami};
}

let logins = 0;

const servers: import("http").Server[] = [];
afterEach(() => {
    for (const server of servers.splice(0)) server.close();
});

const admin = {id: 1, login: "admin", isAdministrator: true};
const operator = {id: 2, login: "operator", isAdministrator: false};
const marketer = {id: 3, login: "marketer", isAdministrator: false};

describe("pretend to be a user", () => {
    it("keeps the pretended user across requests without a server session", async () => {
        const browser = await start([admin, operator]);
        browser.loginAs(admin);
        expect(await browser.whoami()).toBe("admin");

        const response = await browser.call("/admin/model/User/login", {login: "operator", pretend: true});
        expect(response.status).toBe(302);
        expect(await browser.whoami()).toBe("operator");
        expect(await browser.whoami()).toBe("operator");
    });

    it("does not reissue the auth token", async () => {
        const browser = await start([admin, operator]);
        browser.loginAs(admin);

        const response = await browser.call("/admin/model/User/login", {login: "operator", pretend: true});
        expect(response.headers.getSetCookie().some((value) => value.startsWith("adminizer_jwt="))).toBe(false);
    });

    it("leaves the other logins of the same administrator alone", async () => {
        const browser = await start([admin, operator]);
        const firstLogin = browser.loginAs(admin);
        await browser.call("/admin/model/User/login", {login: "operator", pretend: true});

        browser.loginAs(admin);
        expect(await browser.whoami()).toBe("admin");

        browser.useCookie(firstLogin);
        expect(await browser.whoami()).toBe("operator");
    });

    it("returns to the administrator on logout, and logs out on the next one", async () => {
        const browser = await start([admin, operator]);
        browser.loginAs(admin);
        await browser.call("/admin/model/User/login", {login: "operator", pretend: true});

        await browser.call("/admin/model/User/logout");
        expect(await browser.whoami()).toBe("admin");

        await browser.call("/admin/model/User/logout");
        expect(await browser.whoami()).toBe(null);
    });

    it("refuses a user who is not an administrator", async () => {
        const browser = await start([admin, operator, marketer]);
        browser.loginAs(operator);

        const response = await browser.call("/admin/model/User/login", {login: "marketer", pretend: true});
        expect(response.status).toBe(403);
        expect(await browser.whoami()).toBe("operator");
    });

    it("refuses to pretend further while already pretending", async () => {
        const browser = await start([admin, operator, marketer]);
        browser.loginAs(admin);
        await browser.call("/admin/model/User/login", {login: "operator", pretend: true});

        const response = await browser.call("/admin/model/User/login", {login: "marketer", pretend: true});
        expect(response.status).toBe(403);
        expect(await browser.whoami()).toBe("operator");
    });

    it("answers 404 for an unknown user and leaves the administrator as is", async () => {
        const browser = await start([admin]);
        browser.loginAs(admin);

        const response = await browser.call("/admin/model/User/login", {login: "nobody", pretend: true});
        expect(response.status).toBe(404);
        expect(await browser.whoami()).toBe("admin");
    });

    it("stops pretending once the administrator loses the flag", async () => {
        const users = [{...admin}, operator];
        const browser = await start(users);
        browser.loginAs(admin);
        await browser.call("/admin/model/User/login", {login: "operator", pretend: true});

        users[0].isAdministrator = false;
        expect(await browser.whoami()).toBe("admin");
    });

    it("falls back to the administrator when the pretended user is gone", async () => {
        const users = [admin, operator];
        const browser = await start(users);
        browser.loginAs(admin);
        await browser.call("/admin/model/User/login", {login: "operator", pretend: true});

        users.pop();
        expect(await browser.whoami()).toBe("admin");
    });
});
