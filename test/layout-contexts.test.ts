import {EventEmitter} from "events";
import express from "express";
import {describe, expect, it, vi} from "vitest";
import {ContextHandler, type AdminContext} from "../src/lib/app-manager/ContextHandler";
import {ControllerHandler} from "../src/lib/app-manager/ControllerHandler";
import {AdminLinkHandler} from "../src/lib/admin-links/AdminLinkHandler";
import {filterAccessibleHrefItems, listAccessibleMenuItems} from "../src/helpers/navigationAccessHelper";
import type {Adminizer} from "../src/lib/Adminizer";
import type {User} from "../src/models/User";

type TestUser = User & { tokens: string[] };

const userWith = (...tokens: string[]) => ({id: 1, login: "user", groups: [], tokens}) as unknown as TestUser;

interface Options {
    routePrefix?: string;
    authEnabled?: boolean;
    models?: Record<string, unknown>;
    menuItems?: unknown[];
}

/** Adminizer stand-in: contexts read config, brand, sections, menu and permissions. */
function createAdminizer(options: Options = {}) {
    const adminizer = {
        emitter: new EventEmitter(),
        config: {
            routePrefix: options.routePrefix ?? "/admin",
            auth: {enable: options.authEnabled ?? true},
            models: options.models ?? {},
            middlewares: [],
        },
        menuHelper: {
            getBrandTitle: () => "Brand",
            getSections: () => ({Stock: {}}),
            getMenuItems: () => options.menuItems ?? [],
        },
        accessRightsHelper: {
            checkPermission: async (token: string, user?: TestUser) => !!user?.tokens?.includes(token),
            checkAnyPermission: async (tokens: string[], user?: TestUser) =>
                !tokens.length || tokens.some((token) => !!user?.tokens?.includes(token)),
        },
        catalogHandler: {getAll: () => []},
        middlewareManager: {bindMiddlewares: (_middlewares: unknown[], action: unknown) => [action]},
    } as unknown as Adminizer;
    adminizer.adminLinkHandler = new AdminLinkHandler(adminizer);
    adminizer.contextHandler = new ContextHandler(adminizer);
    return adminizer;
}

const request = (url: string, extra: Record<string, unknown> = {}) => ({
    originalUrl: url,
    method: "GET",
    headers: {},
    cookies: {},
    user: userWith(),
    ...extra,
}) as unknown as ReqType;

function response() {
    const res = {
        statusCode: 200,
        body: undefined as unknown,
        redirected: undefined as string | undefined,
        cookies: [] as unknown[][],
        sendStatus: vi.fn((code: number) => {
            res.statusCode = code;
            return res;
        }),
        status: vi.fn((code: number) => {
            res.statusCode = code;
            return res;
        }),
        json: vi.fn((body: unknown) => {
            res.body = body;
            return res;
        }),
        redirect: vi.fn((url: string) => {
            res.redirected = url;
        }),
        cookie: vi.fn((...args: unknown[]) => {
            res.cookies.push(args);
        }),
    };
    return res;
}

async function runGuard(adminizer: Adminizer, req: ReqType) {
    const res = response();
    const next = vi.fn();
    (req as any).adminizer = adminizer;
    await adminizer.contextHandler.guard()(req, res as unknown as ResType, next);
    return {res, next};
}

describe("layout contexts: registry", () => {
    it("validates registrations and normalizes the prefix", () => {
        const {contextHandler} = createAdminizer();
        expect(() => contextHandler.register({id: "default", title: "D", prefix: "/d"})).toThrow(/reserved/);
        expect(() => contextHandler.register({id: "a", title: "", prefix: "/a"})).toThrow(/requires id and title/);
        expect(() => contextHandler.register({id: "a", title: "A", prefix: ""})).toThrow(/non-empty prefix/);
        const scope = contextHandler.register({id: "ops", title: "Ops", prefix: "ops/"}, "app1");
        expect(scope.id).toBe("ops");
        expect(contextHandler.get("ops")?.prefix).toBe("/ops");
        expect(() => contextHandler.register({id: "ops", title: "X", prefix: "/x"})).toThrow(/already registered/);
        expect(() => contextHandler.register({id: "ops2", title: "X", prefix: "/ops"})).toThrow(/already used/);
    });

    it("lets only the owner unregister and emits events", () => {
        const adminizer = createAdminizer();
        const events: string[] = [];
        adminizer.emitter.on("app:context:registered", (event: any) => events.push(`reg:${event.id}`));
        adminizer.emitter.on("app:context:unregistered", (event: any) => events.push(`unreg:${event.id}`));
        adminizer.contextHandler.register({id: "ops", title: "Ops", prefix: "/ops"}, "app1");
        adminizer.contextHandler.unregister("ops", "other-app");
        expect(adminizer.contextHandler.get("ops")).toBeDefined();
        adminizer.contextHandler.unregister("ops", "app1");
        expect(adminizer.contextHandler.get("ops")).toBeUndefined();
        expect(events).toEqual(["reg:ops", "unreg:ops"]);
        // An app enabled again registers its context again.
        adminizer.contextHandler.register({id: "ops", title: "Ops", prefix: "/ops"}, "app1");
        expect(adminizer.contextHandler.get("ops")).toBeDefined();
    });

    it("merges default context options", () => {
        const {contextHandler} = createAdminizer({routePrefix: "/admin/"});
        expect(contextHandler.getDefault().title).toBe("Brand");
        contextHandler.configureDefault({title: "Main", icon: "home"});
        contextHandler.configureDefault({home: "/dashboard"});
        const props = contextHandler.toProps(contextHandler.getDefault());
        expect(props).toMatchObject({id: "default", title: "Main", icon: "home", prefix: "/admin", link: "/admin/dashboard"});
    });
});

describe("layout contexts: resolving a request", () => {
    function setup() {
        const adminizer = createAdminizer();
        adminizer.contextHandler.register({id: "ops", title: "Ops", prefix: "/ops", accessRightsToken: "ops"});
        adminizer.contextHandler.register({id: "deep", title: "Deep", prefix: "/ops/deep"});
        adminizer.contextHandler.register({id: "secret", title: "Secret", prefix: "/secret", accessRightsToken: "nope"});
        adminizer.contextHandler.register({
            id: "data", title: "Data", prefix: "/data",
            navbar: {items: [{id: "cat", title: "Categories", link: "/admin/model/Category", type: "self"}]},
        });
        return adminizer;
    }
    const user = userWith("ops");

    it("matches the longest prefix, by whole segments", async () => {
        const {contextHandler} = setup();
        expect((await contextHandler.resolve(request("/admin/ops/x", {user}))).id).toBe("ops");
        expect((await contextHandler.resolve(request("/admin/ops/deep/1", {user}))).id).toBe("deep");
        expect((await contextHandler.resolve(request("/admin/opsx", {user}))).id).toBe("default");
    });

    it("falls back to the default context for users who may not enter", async () => {
        const {contextHandler} = setup();
        expect((await contextHandler.resolve(request("/admin/secret", {user}))).id).toBe("default");
        expect((await contextHandler.resolve(request("/admin/ops", {user: undefined}))).id).toBe("default");
        expect((await contextHandler.listAccessible(user)).map((context) => context.id)).toEqual(["default", "ops", "deep", "data"]);
    });

    it("keeps a built-in page in the remembered context whose navbar links to it", async () => {
        const {contextHandler} = setup();
        const cookies = {adminizer_context: "data"};
        expect((await contextHandler.resolve(request("/admin/model/Category/edit/1", {user, cookies}))).id).toBe("data");
        expect((await contextHandler.resolve(request("/admin/model/Other", {user, cookies}))).id).toBe("default");
        expect((await contextHandler.resolve(request("/admin/model/Category", {user}))).id).toBe("default");
    });

    it("remembers page visits only", () => {
        const {contextHandler} = setup();
        const res = response();
        contextHandler.remember(request("/admin/ops", {method: "POST"}), res as unknown as ResType, contextHandler.get("ops")!);
        expect(res.cookie).not.toHaveBeenCalled();
        contextHandler.remember(request("/admin/ops"), res as unknown as ResType, contextHandler.get("ops")!);
        expect(res.cookies[0]?.[1]).toBe("ops");
        expect((res.cookies[0]?.[2] as any).path).toBe("/admin");
    });
});

describe("layout contexts: no contexts registered", () => {
    const menuItems = [
        {id: "a", title: "A", link: "/admin/model/A", actions: [], accessRightsToken: "read-A-model", section: "Data"},
        {id: "b", title: "B", link: "/admin/b", actions: null, accessRightsToken: null},
    ];

    it("gives the plain panel's menu, sections and layout", async () => {
        const adminizer = createAdminizer({menuItems});
        const {contextHandler} = adminizer;
        const user = userWith("read-A-model");
        const context = await contextHandler.resolve(request("/admin/model/A", {user, cookies: {adminizer_context: "gone"}}));
        expect(context.id).toBe("default");
        expect(await contextHandler.listMenuItems(context, user)).toEqual(await listAccessibleMenuItems(adminizer, user));
        expect(contextHandler.getSections(context)).toEqual(adminizer.menuHelper.getSections());
        expect(contextHandler.toProps(context).layout).toEqual({root: "stock", layers: [], stylesheets: []});
        // A single context: no switcher, no cookie.
        expect(await contextHandler.listAccessible(user)).toHaveLength(1);
    });

    it("lets every request through the guard and blocks no link", async () => {
        const adminizer = createAdminizer({menuItems, models: {A: {title: "A", model: "a"}}});
        const {next, res} = await runGuard(adminizer, request("/admin/model/A/edit/1", {user: undefined}));
        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
        expect(await adminizer.contextHandler.isBlocked("/admin/model/A", undefined)).toBe(false);
    });
});

describe("layout contexts: layouts", () => {
    function setup() {
        const {contextHandler} = createAdminizer();
        const register = (context: Omit<AdminContext, "title" | "prefix">) =>
            contextHandler.register({title: context.id, prefix: `/${context.id}`, ...context});
        return {contextHandler, register};
    }
    const stock = {root: "stock", layers: [], stylesheets: []};

    it("resolves the current values", () => {
        const {contextHandler, register} = setup();
        register({id: "inherit"});
        register({id: "stock", layout: "stock"});
        register({id: "none", layout: "none"});
        register({id: "module", layout: {module: "/m.js", stylesheet: "/m.css"}});
        expect(contextHandler.resolveLayout(contextHandler.get("inherit")!)).toEqual(stock);
        expect(contextHandler.resolveLayout(contextHandler.get("stock")!)).toEqual(stock);
        expect(contextHandler.resolveLayout(contextHandler.get("none")!)).toEqual({root: "none", layers: [], stylesheets: []});
        expect(contextHandler.resolveLayout(contextHandler.get("module")!))
            .toEqual({root: "stock", layers: [{module: "/m.js"}], stylesheets: ["/m.css"]});
    });

    it("keeps the old values as aliases", () => {
        const {contextHandler, register} = setup();
        register({id: "plain", layout: "default"});
        register({id: "bare", layout: "bare"});
        register({id: "overrides", layout: {overrides: "/o.js", stylesheet: "/o.css"}});
        register({id: "component", layout: {component: "/c.js", stylesheet: "/c.css"}});
        expect(contextHandler.resolveLayout(contextHandler.get("plain")!)).toEqual(stock);
        expect(contextHandler.resolveLayout(contextHandler.get("bare")!)).toEqual({root: "none", layers: [], stylesheets: []});
        expect(contextHandler.resolveLayout(contextHandler.get("overrides")!))
            .toEqual({root: "stock", layers: [{module: "/o.js"}], stylesheets: ["/o.css"]});
        expect(contextHandler.resolveLayout(contextHandler.get("component")!))
            .toEqual({root: "stock", layers: [{module: "/c.js", default: "Layout"}], stylesheets: ["/c.css"]});
    });

    it("chains the default context's layers", () => {
        const {contextHandler, register} = setup();
        register({id: "a"});
        register({id: "b", layout: {module: "/b.js", stylesheet: "/b.css"}});
        register({id: "c", layout: "stock"});
        register({id: "d", layout: {module: "/d.js", base: "stock"}});
        register({id: "e", layout: {component: "/e.js"}});
        contextHandler.configureDefault({layout: {module: "/def.js"}});
        expect(contextHandler.resolveLayout(contextHandler.get("a")!)).toEqual({root: "stock", layers: [{module: "/def.js"}], stylesheets: []});
        expect(contextHandler.resolveLayout(contextHandler.get("b")!))
            .toEqual({root: "stock", layers: [{module: "/def.js"}, {module: "/b.js"}], stylesheets: ["/b.css"]});
        expect(contextHandler.resolveLayout(contextHandler.get("c")!)).toEqual(stock);
        expect(contextHandler.resolveLayout(contextHandler.get("d")!)).toEqual({root: "stock", layers: [{module: "/d.js"}], stylesheets: []});
        // A whole layout of its own draws nothing of the parent, as before.
        expect(contextHandler.resolveLayout(contextHandler.get("e")!).layers).toEqual([{module: "/e.js", default: "Layout"}]);
    });

    it("keeps the parent's layers under a module whatever the parent is", () => {
        const {contextHandler, register} = setup();
        register({id: "a"});
        register({id: "b", layout: {overrides: "/b.js"}});
        contextHandler.configureDefault({layout: {component: "/full.js"}});
        expect(contextHandler.resolveLayout(contextHandler.get("a")!).layers).toEqual([{module: "/full.js", default: "Layout"}]);
        expect(contextHandler.resolveLayout(contextHandler.get("b")!).layers)
            .toEqual([{module: "/full.js", default: "Layout"}, {module: "/b.js"}]);
        contextHandler.configureDefault({layout: "none"});
        expect(contextHandler.resolveLayout(contextHandler.get("b")!)).toEqual({root: "none", layers: [{module: "/b.js"}], stylesheets: []});
    });
});

describe("layout contexts: navbar", () => {
    it("inherits the default context's menu and sections until given its own", async () => {
        const {contextHandler} = createAdminizer();
        contextHandler.register({id: "a", title: "A", prefix: "/a"});
        expect(contextHandler.getSections(contextHandler.get("a")!)).toEqual({Stock: {}});
        contextHandler.configureDefault({
            navbar: {items: [{id: "x", title: "X", link: "/admin/x", type: "self"}], sections: {Main: {order: 1}}},
        });
        expect(contextHandler.getSections(contextHandler.get("a")!)).toEqual({Main: {order: 1}});
        const items = await contextHandler.listMenuItems(contextHandler.get("a")!, userWith());
        expect(items.map((item) => [item.title, item.section])).toEqual([["X", "Brand"]]);
    });
});

describe("layout contexts: pages of a context", () => {
    function setup(context: Partial<AdminContext> = {}) {
        const adminizer = createAdminizer();
        const controllers: any[] = [];
        adminizer.contextHandler.register({id: "support", title: "Support", prefix: "/support", ...context});
        const scope = adminizer.contextHandler.scope<string>("support", {
            controller: (controller) => {
                controllers.push(controller);
                return `/admin${controller.route}`;
            },
            component: (url) => url,
        });
        return {adminizer, scope, controllers};
    }

    it("registers the route, the menu item and the declaration in one call", async () => {
        const {adminizer, scope, controllers} = setup();
        const item = scope.page({id: "inbox", title: "Inbox", icon: "inbox", path: "", component: "/inbox.js", badge: 3});
        scope.page({id: "tickets", title: "Tickets", path: "tickets/", component: "/tickets.js"});
        expect(item).toEqual({id: "inbox", title: "Inbox", icon: "inbox", link: "/admin/support", type: "self", badge: 3});
        expect(controllers.map((controller) => [controller.route, controller.method, controller.context, controller.policies]))
            .toEqual([
                ["/support", "get", "support", [{type: "auth", mode: "ui"}]],
                ["/support/tickets", "get", "support", [{type: "auth", mode: "ui"}]],
            ]);
        const menu = await adminizer.contextHandler.listMenuItems(adminizer.contextHandler.get("support")!, userWith());
        expect(menu.map((entry) => entry.link)).toEqual(["/admin/support", "/admin/support/tickets"]);
    });

    it("renders a component page with context breadcrumbs, page props winning", async () => {
        const {scope, controllers} = setup();
        scope.page({
            id: "inbox", title: "Inbox", path: "/inbox", component: "/inbox.js",
            props: async (req) => ({data: {url: req.originalUrl}}),
        });
        const render = vi.fn();
        await controllers[0].middleware({originalUrl: "/admin/support/inbox", i18n: {__: (text: string) => text}, Inertia: {render}});
        expect(render).toHaveBeenCalledWith({
            component: "module",
            props: {
                moduleComponent: "/inbox.js",
                title: "Inbox · Support",
                breadcrumbs: [{title: "Support", href: "/admin/support"}, {title: "Inbox"}],
                data: {url: "/admin/support/inbox"},
            },
        });
    });

    it("adds routes without menu items", () => {
        const {scope, controllers} = setup({navbar: {items: []}});
        const middleware = vi.fn();
        expect(scope.controller({id: "reply", method: "post", path: "/tickets/:id/reply", middleware})).toBe("/admin/support/tickets/:id/reply");
        scope.page({id: "hidden", title: "Hidden", path: "/hidden", component: "/h.js", menu: false});
        expect(controllers[0]).toMatchObject({route: "/support/tickets/:id/reply", context: "support", policies: [{type: "auth", mode: "api"}]});
        scope.page({id: "public", title: "Public", path: "/public", component: "/p.js", policies: []});
        expect(controllers[2].policies).toEqual([]);
    });

    it("follows the navbar rule: inherited stays inherited, left out becomes own", () => {
        const inherited = setup({navbar: "inherit"});
        inherited.scope.page({id: "a", title: "A", path: "/a", component: "/a.js"});
        expect(inherited.adminizer.contextHandler.get("support")?.navbar).toBe("inherit");
        expect(() => inherited.scope.page({id: "b", title: "B", path: "/b", component: "/b.js", menu: true})).toThrow(/inherits its navbar/);

        const leftOut = setup();
        leftOut.scope.page({id: "a", title: "A", path: "/a", component: "/a.js", menu: false});
        expect(leftOut.adminizer.contextHandler.get("support")?.navbar).toBeUndefined();
        leftOut.scope.menuItem({id: "x", title: "X", link: "/admin/x", type: "self"});
        expect(leftOut.adminizer.contextHandler.get("support")?.navbar).toEqual({items: [{id: "x", title: "X", link: "/admin/x", type: "self"}]});
    });

    it("does not let the caller's navbar items change afterwards", () => {
        const items = [{id: "x", title: "X", link: "/admin/x", type: "self" as const}];
        const {scope} = setup({navbar: {items}});
        scope.menuItem({id: "y", title: "Y", link: "/admin/y", type: "self"});
        expect(items).toHaveLength(1);
    });

    it("requires either a component or a handler", () => {
        const {scope} = setup();
        expect(() => scope.page({id: "a", title: "A", path: "/a"})).toThrow(/either component or middleware/);
        expect(() => scope.page({id: "a", title: "A", path: "/a", component: "/a.js", middleware: vi.fn()})).toThrow(/either component or middleware/);
    });
});

describe("layout contexts: pages declaring their context", () => {
    function setup(options: Options = {}) {
        const adminizer = createAdminizer({
            models: {
                Category: {title: "Category", model: "category", context: "system"},
                Orders: {title: "Orders", model: "orders", context: "missing"},
                User: {title: "User", model: "userap", context: "system"},
                Plain: {title: "Plain", model: "plain"},
            },
            ...options,
        });
        adminizer.contextHandler.register({id: "system", title: "System", prefix: "/system", accessRightsToken: "system"});
        adminizer.contextHandler.register({id: "support", title: "Support", prefix: "/support"});
        return adminizer;
    }

    it("finds the most specific declaration", () => {
        const {contextHandler} = setup();
        contextHandler.assign("/reports", "support");
        contextHandler.assign("/reports/:id/invoice", "system", {exact: true});
        expect(contextHandler.declaredFor("/admin/model/Category/edit/1?x=1")).toBe("system");
        expect(contextHandler.declaredFor("/admin/model/category")).toBe("system");
        expect(contextHandler.declaredFor("/admin/model/Plain")).toBeUndefined();
        expect(contextHandler.declaredFor("/admin/reports/7")).toBe("support");
        expect(contextHandler.declaredFor("/admin/reports/7/invoice")).toBe("system");
        expect(contextHandler.declaredFor("/admin/reports/7/invoice/pdf")).toBe("support");
        expect(contextHandler.declaredFor("/admin/reportsx")).toBeUndefined();
    });

    it("never declares login, logout, registration and the first-user setup", () => {
        const {contextHandler} = setup();
        contextHandler.assign("", "system");
        expect(contextHandler.declaredFor("/admin/model/User/login")).toBeUndefined();
        expect(contextHandler.declaredFor("/admin/model/User/logout")).toBeUndefined();
        expect(contextHandler.declaredFor("/admin/model/User/register")).toBeUndefined();
        expect(contextHandler.declaredFor("/admin/init_user")).toBeUndefined();
        expect(contextHandler.declaredFor("/admin/model/User")).toBe("system");
    });

    it("removes a declaration", () => {
        const {contextHandler} = setup();
        const unassign = contextHandler.assign("/x", "support");
        unassign();
        expect(contextHandler.declaredFor("/admin/x")).toBeUndefined();
    });

    it("renders a declared page in its context, ahead of prefix and cookie", async () => {
        const {contextHandler} = setup();
        contextHandler.assign("/support/settings", "system", {exact: true});
        const user = userWith("system");
        const cookies = {adminizer_context: "support"};
        expect((await contextHandler.resolve(request("/admin/model/Category", {user, cookies}))).id).toBe("system");
        expect((await contextHandler.resolve(request("/admin/support/settings", {user}))).id).toBe("system");
    });

    it("blocks a declared page for users who may not enter its context", async () => {
        const adminizer = setup();
        const {contextHandler} = adminizer;
        expect(await contextHandler.isBlocked("/admin/model/Category", userWith("system"))).toBe(false);
        expect(await contextHandler.isBlocked("/admin/model/Category", userWith())).toBe(true);
        expect(await contextHandler.isBlocked("/admin/model/Category", undefined)).toBe(true);
        expect(await contextHandler.isBlocked("/admin/model/Orders", userWith("system"))).toBe(true);
        expect(await contextHandler.isBlocked("/admin/model/Plain", userWith())).toBe(false);
        contextHandler.assign("/support/x", "support");
        expect(await contextHandler.isBlocked("/admin/support/x", userWith())).toBe(false);

        const open = setup({authEnabled: false});
        expect(await open.contextHandler.isBlocked("/admin/model/Category", userWith())).toBe(false);
        expect(await open.contextHandler.isBlocked("/admin/model/Orders", userWith())).toBe(true);
    });

    it("answers 403, login or 404 before any handler", async () => {
        const adminizer = setup();
        const inertia = {headers: {"x-inertia": "true"}};

        let result = await runGuard(adminizer, request("/admin/model/Category/edit/1", {...inertia, user: userWith("system")}));
        expect(result.next).toHaveBeenCalledOnce();

        result = await runGuard(adminizer, request("/admin/model/Category/edit/1", {...inertia, user: userWith()}));
        expect(result.next).not.toHaveBeenCalled();
        expect(result.res.sendStatus).toHaveBeenCalledWith(403);

        result = await runGuard(adminizer, request("/admin/model/Category/filter-fields", {method: "POST", user: userWith()}));
        expect(result.res.statusCode).toBe(403);
        expect(result.res.json).toHaveBeenCalled();

        result = await runGuard(adminizer, request("/admin/model/Category", {...inertia, user: undefined}));
        expect(result.res.redirected).toMatch(/\/admin\/model\/User\/login\?redirectTo=/);

        result = await runGuard(adminizer, request("/admin/model/User/login", {...inertia, user: undefined}));
        expect(result.next).toHaveBeenCalledOnce();
    });

    it("answers 404 for a context that is not registered and logs it once", async () => {
        const {Adminizer} = await import("../src/lib/Adminizer");
        const error = vi.spyOn(Adminizer.logger, "error").mockImplementation(() => Adminizer.logger);
        const adminizer = setup();
        const html = {headers: {accept: "text/html"}, user: userWith("system")};
        const first = await runGuard(adminizer, request("/admin/model/Orders", html));
        await runGuard(adminizer, request("/admin/model/Orders/edit/2", html));
        expect(first.res.sendStatus).toHaveBeenCalledWith(404);
        expect(first.next).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledOnce();
        error.mockRestore();
    });

    it("hides links to blocked pages from menus and link search", async () => {
        const adminizer = setup({
            menuItems: [
                {id: "cat", title: "Categories", link: "/admin/model/Category", actions: [], accessRightsToken: null},
                {
                    id: "group", title: "Group", link: "/admin/group", accessRightsToken: null,
                    actions: [
                        {id: "cat-add", title: "New category", link: "/admin/model/Category/add", type: "self"},
                        {id: "plain", title: "Plain", link: "/admin/model/Plain", type: "self"},
                    ],
                },
            ],
        });
        adminizer.adminLinkHandler.add({type: "page", name: "orders", link: "/admin/model/Orders/report"});
        adminizer.adminLinkHandler.add({type: "page", name: "home", link: "/admin/home"});
        const user = userWith();

        const menu = await listAccessibleMenuItems(adminizer, user);
        expect(menu.map((item) => item.id)).toEqual(["group", "page:home"]);
        expect(menu[0].actions?.map((action) => action.id)).toEqual(["plain"]);
        expect((await filterAccessibleHrefItems(adminizer, user, [
            {id: "c", title: "C", link: "/admin/model/Category", type: "self"},
        ]))).toEqual([]);
        const tokens = ["update-Category-model", "create-Category-model", "update-Plain-model"];
        const templates = async (forUser: User) =>
            (await adminizer.adminLinkHandler.listTemplates(forUser)).map((template) => template.template);
        const blocked = await templates(userWith(...tokens));
        expect(blocked).toContain("/admin/model/Plain/edit/:id");
        expect(blocked.some((template) => template.includes("/model/Category/"))).toBe(false);
        expect(await templates(userWith("system", ...tokens))).toContain("/admin/model/Category/edit/:id");

        const permitted = await listAccessibleMenuItems(adminizer, userWith("system"));
        expect(permitted.map((item) => item.id)).toEqual(["cat", "group", "page:home"]);
    });

    it("hides blocked items of a context's own navbar", async () => {
        const adminizer = setup();
        adminizer.contextHandler.register({
            id: "data", title: "Data", prefix: "/data",
            navbar: {items: [
                {id: "cat", title: "Categories", link: "/admin/model/Category", type: "self"},
                {id: "plain", title: "Plain", link: "/admin/model/Plain", type: "self"},
            ]},
        });
        const menu = await adminizer.contextHandler.listMenuItems(adminizer.contextHandler.get("data")!, userWith());
        expect(menu.map((item) => item.id)).toEqual(["plain"]);
    });

    it("declares the routes of controllers that name their context", async () => {
        const adminizer = setup();
        (adminizer as any).app = express();
        (adminizer as any).appManager = {createRuntime: () => ({})};
        const controllers = new ControllerHandler(adminizer);
        controllers.register("app", {id: "invoice", method: "get", route: "/orders/:id/invoice", context: "system", middleware: vi.fn()});
        expect(adminizer.contextHandler.declaredFor("/admin/orders/5/invoice")).toBe("system");
        expect(adminizer.contextHandler.declaredFor("/admin/orders/5/invoice/x")).toBeUndefined();
        controllers.unregister("app:invoice");
        expect(adminizer.contextHandler.declaredFor("/admin/orders/5/invoice")).toBeUndefined();
    });
});
