import {describe, expect, it} from "vitest";
import {AdminLinkHandler} from "../src/lib/admin-links/AdminLinkHandler";
import {AiAssistantUiMethodHandler} from "../src/lib/ai-assistant/AiAssistantUiMethodHandler";
import type {Adminizer} from "../src/lib/Adminizer";
import type {User} from "../src/models/User";

const operator = {id: 2, login: "operator", groups: [{name: "operators", tokens: []}]} as unknown as User;

/**
 * Minimal Adminizer stand-in: the link handlers only read config, permissions,
 * catalogs and the navigation menu.
 */
function createAdminizer(permitted: string[], menuItems: any[] = []) {
    const handlers = {
        config: {
            routePrefix: "/admin",
            models: {
                Test: {model: "Test", title: "Test"},
                Secret: {model: "Secret", title: "Secret"},
            },
        },
        accessRightsHelper: {
            checkPermission: async (token: string) => permitted.includes(token),
            hasStaticPermission: (token: string) => permitted.includes(token),
            checkAnyPermission: async (tokens: string[]) => !tokens.length || tokens.some((token) => permitted.includes(token)),
            enoughStaticPermissions: (tokens: string[]) => !tokens.length || tokens.some((token) => permitted.includes(token)),
        },
        catalogHandler: {
            getAll: () => [{slug: "pages", name: "Pages"}],
        },
        menuHelper: {
            getMenuItems: () => menuItems,
        },
    } as unknown as Adminizer;

    const adminLinkHandler = new AdminLinkHandler(handlers);
    (handlers as any).adminLinkHandler = adminLinkHandler;
    const uiMethodHandler = new AiAssistantUiMethodHandler(handlers);
    (handlers as any).aiAssistantUiMethodHandler = uiMethodHandler;
    return {adminizer: handlers, adminLinkHandler, uiMethodHandler};
}

const menu = [{
    id: "Test", title: "Test", link: "/admin/model/Test", section: "Content",
    accessRightsToken: "read-Test-model", actions: null,
}];

describe("admin link registry: locate", () => {
    it("chains the pages whose path prefixes the url", async () => {
        const {adminLinkHandler} = createAdminizer(["read-Test-model", "update-Test-model"], menu);
        expect(await adminLinkHandler.locate(operator, "/admin/model/Test/edit/5?tab=1")).toEqual([
            {title: "Test", href: "/admin/model/Test"},
            {title: "Test: open record"},
        ]);
    });

    it("renders the page itself without a link", async () => {
        const {adminLinkHandler} = createAdminizer(["read-Test-model"], menu);
        expect(await adminLinkHandler.locate(operator, "/admin/model/Test/")).toEqual([{title: "Test"}]);
    });

    it("hides pages the user may not open, unknown paths and foreign prefixes", async () => {
        const {adminLinkHandler} = createAdminizer([], menu);
        expect(await adminLinkHandler.locate(operator, "/admin/model/Test/edit/5")).toEqual([]);
        expect(await adminLinkHandler.locate(operator, "/admin/nothing/here")).toEqual([]);
        expect(await adminLinkHandler.locate(operator, "/other/model/Test")).toEqual([]);
        expect(await adminLinkHandler.locate(operator, "/admin")).toEqual([]);
    });

    it("uses the menu handed in by the caller (translated titles)", async () => {
        const {adminLinkHandler} = createAdminizer(["read-Test-model"]);
        const translated = [{...menu[0], title: "Тест"}];
        expect(await adminLinkHandler.locate(operator, "/admin/model/Test", translated as any))
            .toEqual([{title: "Тест"}]);
    });

    it("walks app links and templates registered at runtime", async () => {
        const {adminLinkHandler} = createAdminizer(["agentiz"]);
        adminLinkHandler.add({id: "x", type: "page", name: "agentiz", title: "Agentiz", link: "/admin/agentiz", accessRightsToken: "agentiz"}, "agentiz");
        adminLinkHandler.addTemplate({id: "agentiz-project", title: "Project", template: "/admin/agentiz/projects/:slug", accessRightsToken: "agentiz"}, "agentiz");
        adminLinkHandler.addTemplate({id: "agentiz-run", title: "Run", template: "/admin/agentiz/projects/:slug/runs/:id", accessRightsToken: "agentiz"}, "agentiz");

        expect(await adminLinkHandler.locate(operator, "/admin/agentiz/projects/p1/runs/r7")).toEqual([
            {title: "Agentiz", href: "/admin/agentiz"},
            {title: "Project", href: "/admin/agentiz/projects/p1"},
            {title: "Run"},
        ]);
    });
});

describe("admin link registry: search", () => {
    it("is what the assistant's searchAdminLinks returns", async () => {
        const {adminLinkHandler, uiMethodHandler} = createAdminizer(["read-Test-model", "update-Test-model"], menu);
        const viaRegistry = await adminLinkHandler.search(operator, "test");
        expect(viaRegistry).toEqual(await uiMethodHandler.searchAdminLinks(operator, "test"));
        expect(viaRegistry.map((hit) => hit.id)).toEqual(expect.arrayContaining(["Test", "model-Test-edit"]));
    });
});
