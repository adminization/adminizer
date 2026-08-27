import {describe, expect, it, vi} from "vitest";
import {AccessRightsHelper} from "../src/helpers/accessRightsHelper";
import {listAccessibleMenuItems} from "../src/helpers/navigationAccessHelper";
import {AdminLinkHandler} from "../src/lib/admin-links/AdminLinkHandler";
import {AiAssistantAgentSkillHandler} from "../src/lib/ai-assistant/AiAssistantAgentSkillHandler";
import {WidgetHandler} from "../src/lib/widgets/widgetHandler";
import type {Adminizer} from "../src/lib/Adminizer";
import type {User} from "../src/models/User";

const logger = vi.hoisted(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), verbose: vi.fn(), silly: vi.fn(), close: vi.fn(),
}));

vi.mock("winston", () => {
    const winston = {
        format: {combine: vi.fn(() => ({})), timestamp: vi.fn(() => ({})), printf: vi.fn(() => ({}))},
        transports: {Console: class Console {}, File: class File {}},
        createLogger: vi.fn(() => logger),
    };
    return {...winston, default: winston};
});

/** Grants the token for project "a" only — the panel-wide contextual case. */
const SCOPED_TOKEN = "project-scope";

/**
 * A user carrying the token, scoped to project "a". Before the access-rights
 * API became asynchronous this user passed every synchronous check, in any
 * project, because a pending promise is truthy.
 */
const operator = {
    id: 7,
    login: "operator",
    isAdministrator: false,
    groups: [{name: "operators", tokens: [{tokenId: SCOPED_TOKEN, rights: ["a"]}]}],
} as unknown as User;

const i18n = {__: (value: string) => value} as any;

function createAdminizer(menuItems: any[] = []) {
    const adminizer: any = {
        config: {
            auth: {enable: true},
            routePrefix: "/admin",
            models: {},
        },
        catalogHandler: {getAll: () => []},
        menuHelper: {getMenuItems: () => menuItems},
        appManager: {createRuntime: () => ({})},
        modelHandler: {
            getResource: () => undefined,
            getResourceRecord: () => undefined,
            resolveResourceByHostModel: () => undefined,
            model: new Map(),
        },
    };

    adminizer.accessRightsHelper = new AccessRightsHelper(adminizer as Adminizer);
    adminizer.accessRightsHelper.registerToken({
        id: SCOPED_TOKEN,
        name: "Project scope",
        description: "Access to individually selected projects",
        department: "Fixture",
        getOptions: async () => [{id: "a", name: "Project A"}, {id: "b", name: "Project B"}],
        check: async (_user, context) => {
            const project = context?.project;
            return typeof project === "string" ? context?.rights?.includes(project) ?? false : false;
        },
    });
    adminizer.adminLinkHandler = new AdminLinkHandler(adminizer as Adminizer);
    return adminizer as Adminizer & {accessRightsHelper: AccessRightsHelper};
}

describe("contextual tokens across the panel surfaces", () => {
    it("narrows access to the granted scope instead of the whole token", async () => {
        const {accessRightsHelper} = createAdminizer();

        expect(await accessRightsHelper.hasPermission(SCOPED_TOKEN, operator, {project: "a"})).toBe(true);
        expect(await accessRightsHelper.hasPermission(SCOPED_TOKEN, operator, {project: "b"})).toBe(false);
        // Rights sent by a client can never widen the grant.
        expect(await accessRightsHelper.hasPermission(SCOPED_TOKEN, operator, {project: "b", rights: ["b"]})).toBe(false);
    });

    it("denies a contextual token in a synchronous check, having no context to judge by", () => {
        const {accessRightsHelper} = createAdminizer();

        expect(accessRightsHelper.hasStaticPermission(SCOPED_TOKEN, operator)).toBe(false);
        expect(accessRightsHelper.enoughStaticPermissions([SCOPED_TOKEN], operator)).toBe(false);
        // An ordinary token assigned to the same user still resolves synchronously.
        accessRightsHelper.registerToken({
            id: "plain-token", name: "Plain", description: "Ordinary token", department: "Fixture",
        });
        const plainUser = {...operator, groups: [{name: "operators", tokens: ["plain-token"]}]} as unknown as User;
        expect(accessRightsHelper.hasStaticPermission("plain-token", plainUser)).toBe(true);
    });

    it("hides a navigation item whose contextual token rejects the request", async () => {
        const adminizer = createAdminizer([
            {
                id: "projects", title: "Projects", link: "/admin/projects", section: "Content",
                accessRightsToken: SCOPED_TOKEN,
                actions: [
                    {id: "scoped", title: "Scoped", link: "/admin/projects", accessRightsToken: SCOPED_TOKEN},
                ],
            },
        ]);

        const menu = await listAccessibleMenuItems(adminizer, operator);

        expect(menu.map((item) => item.id)).not.toContain("projects");
    });

    it("hides an admin link whose contextual token rejects the request", async () => {
        const adminizer = createAdminizer();
        adminizer.adminLinkHandler.add({
            id: "projects", type: "tool", name: "projects", link: "/admin/projects",
            title: "Projects", accessRightsToken: SCOPED_TOKEN,
        });

        expect(await adminizer.adminLinkHandler.list(operator)).toEqual([]);
    });

    it("hides a widget whose contextual token rejects the request", async () => {
        const adminizer = createAdminizer();
        const widgetHandler = new WidgetHandler(adminizer);
        widgetHandler.add({
            id: "projects", widgetType: "info", name: "Projects", description: "Scoped widget",
            department: "Fixture", accessRightsToken: SCOPED_TOKEN, icon: "list",
        } as any);

        expect(await widgetHandler.getAll(operator, i18n)).toEqual([]);
    });

    it("hides an assistant skill whose contextual token rejects the request", async () => {
        const adminizer = createAdminizer();
        const skillHandler = new AiAssistantAgentSkillHandler(adminizer);
        skillHandler.add({
            id: "project_report",
            description: "Report",
            inputSchema: {type: "object", properties: {}},
            accessRightsToken: SCOPED_TOKEN,
            execute: () => ({ok: true}),
        }, "projects");

        expect((await skillHandler.getAvailable(operator)).map((skill) => skill.id)).not.toContain("project_report");
        await expect(skillHandler.execute("project_report", {}, operator)).rejects.toThrow(/is not available/);
    });
});
