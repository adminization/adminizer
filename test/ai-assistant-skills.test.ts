import {describe, expect, it, vi} from "vitest";
import {AiAssistantAgentSkillHandler, CURRENT_USER_PARAM} from "../src/lib/ai-assistant/AiAssistantAgentSkillHandler";
import {AdminLinkHandler} from "../src/lib/admin-links/AdminLinkHandler";
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

const operator = {
    id: 5,
    login: "operator",
    fullName: "Ops Person",
    groups: [{name: "operators", tokens: []}],
} as unknown as User;

const records = [{id: "1", title: "first"}, {id: "2", title: "second"}];

/** Minimal Adminizer stand-in for the built-in data skills. */
function createAdminizer(permitted: string[]) {
    const model = {
        modelname: "Test",
        primaryKey: "id",
        attributes: {},
        find: async () => records,
        updateOne: async (_criteria: any, values: any) => ({...records[0], ...values}),
    };

    // Case-insensitive like the real AccessRightsHelper, which lowercases token ids
    const has = (token?: string) => Boolean(token) && permitted.some((p) => p.toLowerCase() === token!.toLowerCase());
    const adminizer: any = {
        config: {
            routePrefix: "/admin",
            identifierField: "id",
            models: {Test: {model: "Test", title: "Test"}, Secret: {model: "Secret", title: "Secret"}},
        },
        accessRightsHelper: {
            hasPermission: async (token: string) => has(token),
            hasStaticPermission: (token: string) => has(token),
            enoughPermissions: async (tokens: string[]) => !tokens.length || tokens.some(has),
            enoughStaticPermissions: (tokens: string[]) => !tokens.length || tokens.some(has),
        },
        modelHandler: {
            getResource: (name: string) => (name === "Test" ? model : undefined),
            getResourceRecord: (name: string) => (name === "Test" ? {name: "Test"} : undefined),
            resolveResourceByHostModel: () => undefined,
        },
        appManager: {createRuntime: () => ({})},
        catalogHandler: {getAll: () => []},
        menuHelper: {
            getMenuItems: () => [
                {
                    id: "Test", title: "Test", link: "/admin/model/Test", icon: "list", section: "Content",
                    modelResourceName: "Test", accessRightsToken: "read-Test-model",
                    actions: [
                        {id: "overview", title: "Overview", link: "/admin/model/Test", accessRightsToken: "read-Test-model"},
                        {id: "secret-tool", title: "Secret tool", link: "/admin/model/Secret", accessRightsToken: "read-Secret-model"},
                    ],
                },
                {
                    id: "Secret", title: "Secret", link: "/admin/model/Secret", icon: null, section: "Content",
                    modelResourceName: "Secret", accessRightsToken: "read-Secret-model", actions: null,
                },
            ],
        },
    };
    adminizer.adminLinkHandler = new AdminLinkHandler(adminizer as Adminizer);
    return adminizer as Adminizer;
}

describe("built-in agent skills", () => {
    it("describes the calling user and injects the authenticated identity", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer([]));

        expect(await handler.execute("current_user", {}, operator)).toEqual({
            id: 5,
            login: "operator",
            fullName: "Ops Person",
            email: undefined,
            locale: undefined,
            isAdministrator: false,
            groups: ["operators"],
        });
    });

    it("advertises the current user in the schema of skills that need it", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer(["read-Test-model"]));
        const skill = (await handler.getAvailable(operator)).find((entry) => entry.id === "read_model_records")!;
        const properties = skill.inputSchema.properties as Record<string, any>;

        expect(properties[CURRENT_USER_PARAM].enum).toEqual(["operator"]);
        expect(skill.inputSchema.required).toContain(CURRENT_USER_PARAM);
        expect(properties.model.enum).toEqual(["Test"]);
        expect(skill.description).toContain("Readable models: Test");
    });

    it("hides skills the user has no access right for", async () => {
        const adminizer = createAdminizer([]);
        const handler = new AiAssistantAgentSkillHandler(adminizer);
        handler.add({
            id: "billing_report",
            description: "Report",
            inputSchema: {type: "object", properties: {}},
            accessRightsToken: "billing-token",
            execute: () => ({ok: true}),
        }, "billing");

        expect((await handler.getAvailable(operator)).map((skill) => skill.id)).not.toContain("billing_report");
        await expect(handler.execute("billing_report", {}, operator)).rejects.toThrow(/is not available/);
    });

    it("passes the authenticated user to a skill and overrides a forged one", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer([]));
        const seen: Array<Record<string, unknown>> = [];
        handler.add({
            id: "echo_user",
            description: "Echo",
            inputSchema: {type: "object", properties: {}},
            requiresUser: true,
            execute: (input, context) => {
                seen.push({input, login: context.userIdentity.login, isSameUser: context.user === operator});
                return {ok: true};
            },
        });

        await handler.execute("echo_user", {[CURRENT_USER_PARAM]: "root"}, operator);
        expect(seen[0]).toEqual({
            input: {[CURRENT_USER_PARAM]: "operator"},
            login: "operator",
            isSameUser: true,
        });
    });

    it("reads and updates only the models the user is permitted to", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer(["read-Test-model", "update-Test-model"]));

        expect(await handler.execute("read_model_records", {model: "Test", limit: 1}, operator))
            .toEqual({model: "Test", total: 2, count: 1, records: [records[0]]});
        expect(await handler.execute("update_model_record", {model: "Test", id: "1", values: {title: "renamed"}}, operator))
            .toEqual({model: "Test", id: "1", record: {id: "1", title: "renamed"}});

        await expect(handler.execute("read_model_records", {model: "Secret"}, operator))
            .rejects.toThrow(/not available|not allowed/);
        await expect(handler.execute("update_model_record", {model: "Test", id: "1", values: {}}, operator))
            .rejects.toThrow(/non-empty object/);
    });

    it("shows only the navigation menu the user may open", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer(["read-Test-model"]));
        const result: any = await handler.execute("list_admin_navigation", {}, operator);

        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].section).toBe("Content");
        expect(result.sections[0].items).toHaveLength(1);
        expect(result.sections[0].items[0]).toMatchObject({
            id: "Test", title: "Test", link: "/admin/model/Test", model: "Test",
        });
        // The sub-action pointing at a model the user cannot read is dropped.
        expect(result.sections[0].items[0].actions.map((action: any) => action.id)).toEqual(["overview"]);
        // Read access alone gives no record or create page.
        expect(result.templates).toEqual([]);
    });

    it("adds parametrized pages as templates and honours the query", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer(["read-Test-model", "update-Test-model"]));
        const result: any = await handler.execute("list_admin_navigation", {query: "test"}, operator);

        expect(result.sections[0].items.map((item: any) => item.id)).toEqual(["Test"]);
        expect(result.templates.map((template: any) => template.template)).toEqual(["/admin/model/Test/edit/:id"]);
        expect(result.templates[0].params).toEqual([{name: "id", description: expect.any(String)}]);

        const empty: any = await handler.execute("list_admin_navigation", {query: "billing"}, operator);
        expect(empty.sections).toEqual([]);
        expect(empty.templates).toEqual([]);
    });

    it("lists models with the operations the user actually has", async () => {
        const handler = new AiAssistantAgentSkillHandler(createAdminizer(["read-Test-model"]));
        const listed = (await handler.getAvailable(operator)).find((skill) => skill.id === "list_data_models");
        expect(listed).toBeTruthy();

        return handler.execute("list_data_models", {}, operator).then((result: any) => {
            expect(result.models).toHaveLength(1);
            expect(result.models[0]).toMatchObject({
                name: "Test",
                canRead: true,
                canUpdate: false,
                listUrl: "/admin/model/Test",
                recordUrlTemplate: undefined,
            });
        });
    });
});
