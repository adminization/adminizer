import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {afterAll, describe, expect, it} from "vitest";
import {AbstractDocumentation, DocContent, DocMeta} from "../src/lib/docs/AbstractDocumentation";
import {DocumentationHandler} from "../src/lib/docs/DocumentationHandler";
import {FileDocumentation} from "../src/lib/docs/FileDocumentation";
import type {Adminizer} from "../src/lib/Adminizer";
import type {User} from "../src/models/User";

const operator = {id: 2, login: "operator", groups: [{name: "operators", tokens: []}]} as unknown as User;
const admin = {id: 1, login: "admin", isAdministrator: true, groups: []} as unknown as User;

interface MemoryDoc {
    meta: DocMeta;
    content: Record<string, string>;
}

/** Minimal custom implementation: only the required `list`/`get`. */
class MemoryDocumentation extends AbstractDocumentation {
    constructor(private readonly docs: MemoryDoc[]) {
        super();
    }

    async list(locale?: string): Promise<DocMeta[]> {
        return this.docs.map((doc) => ({...doc.meta}));
    }

    async get(id: string, locale?: string): Promise<DocContent | undefined> {
        const doc = this.docs.find((candidate) => candidate.meta.id === id);
        if (!doc) return undefined;
        const served = locale && doc.content[locale] ? locale : Object.keys(doc.content)[0];
        return {meta: {...doc.meta}, markdown: doc.content[served], locale: served};
    }
}

const docs: MemoryDoc[] = [
    {
        meta: {
            id: "intro", title: "Getting started", section: "Basics",
            keywords: ["dashboard", "widgets"], models: [], urls: ["/admin"],
            locales: ["en", "ru"],
        },
        content: {en: "# Getting started\nThe dashboard is assembled from widgets.", ru: "# Начало работы\nДашборд собирается из виджетов."},
    },
    {
        meta: {
            id: "orders", title: "Orders workflow", section: "Sales",
            keywords: ["orders", "workflow"], models: ["Order"], urls: ["/admin/model/Order"],
        },
        content: {en: "# Orders\nEvery order passes the workflow."},
    },
    {
        meta: {
            id: "secret", title: "Secret operations", section: "Restricted",
            keywords: ["secret", "workflow"], models: [], urls: [],
            accessRightsToken: "read-secret-doc",
        },
        content: {en: "# Secret\nHidden knowledge."},
    },
];

/**
 * Minimal Adminizer stand-in: the handler only reads the documentation config
 * and the access rights helper.
 */
function createAdminizer(permitted: string[]) {
    const adminizer = {
        config: {
            auth: {enable: true},
            translation: {defaultLocale: "en"},
            documentation: {enabled: true},
        },
        accessRightsHelper: {
            hasPermission: (token: string, user: User) => Boolean((user as any).isAdministrator) || permitted.includes(token),
        },
    } as unknown as Adminizer;
    const handler = new DocumentationHandler(adminizer);
    (adminizer as any).documentationHandler = handler;
    return {adminizer, handler};
}

describe("AbstractDocumentation defaults", () => {
    const service = new MemoryDocumentation(docs);

    it("searches metadata and content and returns snippets", async () => {
        const results = await service.search({query: "widgets"});
        expect(results.map((result) => result.meta.id)).toEqual(["intro"]);
        expect(results[0].snippets[0]).toContain("widgets");

        const byContent = await service.search({query: "hidden knowledge"});
        expect(byContent.map((result) => result.meta.id)).toEqual(["secret"]);
    });

    it("filters by keywords requiring every listed keyword", async () => {
        const results = await service.search({keywords: ["workflow"]});
        expect(results.map((result) => result.meta.id).sort()).toEqual(["orders", "secret"]);

        const narrowed = await service.search({keywords: ["workflow", "orders"]});
        expect(narrowed.map((result) => result.meta.id)).toEqual(["orders"]);
    });

    it("matches context by express-style url patterns and by model", async () => {
        expect((await service.forContext({url: "/admin/model/Order?page=2"})).map((meta) => meta.id)).toEqual(["orders"]);
        expect((await service.forContext({model: "Order"})).map((meta) => meta.id)).toEqual(["orders"]);
        expect((await service.forContext({url: "/nowhere"})).length).toBe(0);
    });

    it("aggregates the keyword map and resolves plain-id links", async () => {
        const keywords = await service.keywords();
        expect(keywords.get("workflow")?.sort()).toEqual(["orders", "secret"]);
        expect(await service.resolveLink("intro", "orders#anchor")).toBe("orders");
        expect(await service.resolveLink("intro", "missing")).toBeUndefined();
    });

    it("serves the requested locale with fallback", async () => {
        expect((await service.get("intro", "ru"))?.locale).toBe("ru");
        expect((await service.get("intro", "de"))?.locale).toBe("en");
    });
});

describe("DocumentationHandler access layer", () => {
    it("is invisible without the base token", async () => {
        const {handler} = createAdminizer([]);
        handler.register(new MemoryDocumentation(docs));
        expect(await handler.list(operator)).toEqual([]);
        expect(await handler.get(operator, "intro")).toBeUndefined();
        expect((await handler.keywords(operator)).size).toBe(0);
    });

    it("hides per-doc and model-bound documents the user has no rights for", async () => {
        const {handler} = createAdminizer(["read-documentation"]);
        handler.register(new MemoryDocumentation(docs));
        expect((await handler.list(operator)).map((meta) => meta.id)).toEqual(["intro"]);
        expect(await handler.get(operator, "secret")).toBeUndefined();
        expect(await handler.get(operator, "orders")).toBeUndefined();
        expect((await handler.search(operator, {query: "workflow"})).length).toBe(0);
        const keywords = await handler.keywords(operator);
        expect([...keywords.keys()].sort()).toEqual(["dashboard", "widgets"]);
        expect(await handler.resolveLink(operator, "intro", "orders")).toBeUndefined();
    });

    it("opens model-bound documents through the model read token", async () => {
        const {handler} = createAdminizer(["read-documentation", "read-Order-model"]);
        handler.register(new MemoryDocumentation(docs));
        expect((await handler.list(operator)).map((meta) => meta.id).sort()).toEqual(["intro", "orders"]);
        expect((await handler.get(operator, "orders"))?.markdown).toContain("workflow");
        expect(await handler.resolveLink(operator, "intro", "orders")).toBe("orders");
    });

    it("respects the per-doc token and shows everything to administrators", async () => {
        const {handler} = createAdminizer(["read-documentation", "read-secret-doc"]);
        handler.register(new MemoryDocumentation(docs));
        expect((await handler.get(operator, "secret"))?.markdown).toContain("Hidden");
        expect((await handler.list(admin)).map((meta) => meta.id).sort()).toEqual(["intro", "orders", "secret"]);
    });

    it("passes the locale through and derives the default from the user", async () => {
        const {handler} = createAdminizer(["read-documentation"]);
        handler.register(new MemoryDocumentation(docs));
        expect((await handler.get(operator, "intro", "ru"))?.locale).toBe("ru");
        expect(handler.localeFor({...operator, locale: "ru"} as User)).toBe("ru");
        expect(handler.localeFor(operator)).toBe("en");
    });

    it("summarises the contextual documentation of a page for the UI", async () => {
        const {handler} = createAdminizer(["read-documentation"]);
        handler.register(new MemoryDocumentation(docs));
        expect(await handler.canRead(operator)).toBe(true);
        expect(await handler.forContextMeta(operator, "/admin")).toEqual({
            count: 1,
            items: [{id: "intro", title: "Getting started", section: "Basics"}],
        });
        // the page of a model this user may not read carries no documentation
        expect(await handler.forContextMeta(operator, "/admin/model/Order")).toEqual({count: 0, items: []});
    });

    it("hands the UI nothing when documentation is closed to the user", async () => {
        const {handler} = createAdminizer([]);
        handler.register(new MemoryDocumentation(docs));
        expect(await handler.canRead(operator)).toBe(false);
        expect(await handler.forContextMeta(operator, "/admin")).toBeNull();
    });

    it("is a singleton and refuses to work unregistered", async () => {
        const {handler} = createAdminizer([]);
        await expect(handler.list(operator)).rejects.toThrow(/No documentation service/);
        handler.register(new MemoryDocumentation(docs), "app-a");
        expect(() => handler.register(new MemoryDocumentation(docs), "app-b")).toThrow(/already registered/);
        expect(handler.unregister("app-b")).toBe(false);
        expect(handler.unregister("app-a")).toBe(true);
        expect(handler.isRegistered()).toBe(false);
    });

    it("stays disabled when the config switch is off", async () => {
        const {adminizer, handler} = createAdminizer([]);
        (adminizer.config.documentation as any).enabled = false;
        handler.register(new MemoryDocumentation(docs));
        expect(handler.enabled).toBe(false);
        // the shared prop is asked for on every page: it must stay quiet, not throw
        expect(await handler.forContextMeta(admin, "/admin")).toBeNull();
    });
});

describe("DocumentationHandler wiring", () => {
    it("wires once, and only when the flag is on and a service is registered", () => {
        let wired = 0;
        const {adminizer} = createAdminizer([]);
        const handler = new DocumentationHandler(adminizer, () => wired++);

        handler.activate();
        expect(wired).toBe(0); // the flag alone brings up nothing

        handler.register(new MemoryDocumentation(docs));
        expect(wired).toBe(1);

        // replacing the service reuses the wiring instead of mounting it twice
        handler.unregister();
        handler.register(new MemoryDocumentation(docs));
        expect(wired).toBe(1);
    });

    it("never wires while the flag is off", () => {
        let wired = 0;
        const {adminizer} = createAdminizer([]);
        (adminizer.config.documentation as any).enabled = false;
        const handler = new DocumentationHandler(adminizer, () => wired++);

        handler.register(new MemoryDocumentation(docs));
        handler.activate();
        expect(wired).toBe(0);
    });

    it("wires from init for a service registered before the config was read", () => {
        let wired = 0;
        const {adminizer} = createAdminizer([]);
        const handler = new DocumentationHandler(adminizer, () => wired++);

        const config = (adminizer as any).config;
        (adminizer as any).config = undefined; // register() before init()
        handler.register(new MemoryDocumentation(docs));
        expect(wired).toBe(0);

        (adminizer as any).config = config; // init() reads the config…
        handler.activate(); // …and re-checks
        expect(wired).toBe(1);
    });
});

describe("FileDocumentation", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adminizer-docs-"));
    afterAll(() => fs.rmSync(dir, {recursive: true, force: true}));

    fs.writeFileSync(path.join(dir, "intro.md"), [
        "---",
        "title: Getting started",
        "section: Basics",
        "keywords: [dashboard, widgets]",
        "urls: [/admin]",
        "---",
        "# Getting started",
        "Content about widgets.",
    ].join("\n"));
    fs.writeFileSync(path.join(dir, "intro.ru.md"), [
        "---",
        "title: Начало работы",
        "keywords:",
        "  - дашборд",
        "---",
        "# Начало работы",
        "Русский текст.",
    ].join("\n"));
    fs.writeFileSync(path.join(dir, "secret.md"), [
        "---",
        "title: Secret",
        "accessRightsToken: read-secret-doc",
        "---",
        "Classified.",
    ].join("\n"));

    const service = new FileDocumentation({dir});

    it("scans documents and groups translations under one id", async () => {
        const metas = await service.list();
        const intro = metas.find((meta) => meta.id === "intro");
        expect(intro?.title).toBe("Getting started");
        expect(intro?.locales?.sort()).toEqual(["en", "ru"]);
        expect(intro?.urls).toEqual(["/admin"]);
        expect(metas.find((meta) => meta.id === "secret")?.accessRightsToken).toBe("read-secret-doc");
    });

    it("serves translations by locale with localized metadata and fallback", async () => {
        const ru = await service.get("intro", "ru");
        expect(ru?.locale).toBe("ru");
        expect(ru?.markdown).toContain("Русский текст");
        expect(ru?.meta.title).toBe("Начало работы");
        expect(ru?.meta.keywords).toEqual(["дашборд"]);
        // structural metadata always comes from the default-locale file
        expect(ru?.meta.urls).toEqual(["/admin"]);

        const fallback = await service.get("intro", "de");
        expect(fallback?.locale).toBe("en");
    });

    it("searches file content through the inherited default search", async () => {
        const results = await service.search({query: "classified"});
        expect(results.map((result) => result.meta.id)).toEqual(["secret"]);
    });

    it("rescans after reload", async () => {
        fs.writeFileSync(path.join(dir, "late.md"), "# Late document\nAdded afterwards.");
        expect((await service.list()).find((meta) => meta.id === "late")).toBeUndefined();
        service.reload();
        const late = (await service.list()).find((meta) => meta.id === "late");
        expect(late?.title).toBe("Late document");
    });

    it("returns nothing for a missing directory", async () => {
        const empty = new FileDocumentation({dir: path.join(dir, "does-not-exist")});
        expect(await empty.list()).toEqual([]);
    });
});
