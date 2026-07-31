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
            hasPermission: (token: string) => permitted.includes(token),
            enoughPermissions: (tokens: string[]) => !tokens.length || tokens.some((token) => permitted.includes(token)),
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

describe("admin link templates", () => {
    it("offers a record page only for models the user may edit", () => {
        const {adminLinkHandler} = createAdminizer(["update-Test-model", "catalog-pages"]);
        const ids = adminLinkHandler.listTemplates(operator).map((template) => template.id);

        expect(ids).toContain("model-Test-edit");
        expect(ids).toContain("catalog-pages-item");
        expect(ids).not.toContain("model-Secret-edit");
        expect(ids).not.toContain("model-Test-add");
    });

    it("resolves a template into a concrete url and encodes the values", () => {
        const {adminLinkHandler} = createAdminizer(["update-Test-model"]);

        expect(adminLinkHandler.resolveTemplate(operator, "model-Test-edit", {id: "a b/c"}))
            .toBe("/admin/model/Test/edit/a%20b%2Fc");
        expect(() => adminLinkHandler.resolveTemplate(operator, "model-Test-edit", {}))
            .toThrow(/requires the "id" parameter/);
        expect(() => adminLinkHandler.resolveTemplate(operator, "model-Secret-edit", {id: "1"}))
            .toThrow(/is not available/);
    });

    it("turns a navigation link with placeholders into a template", () => {
        const {adminLinkHandler} = createAdminizer(["reports-token"], [{
            id: "report",
            title: "Report",
            link: "/admin/reports/:period",
            accessRightsToken: "reports-token",
            actions: null,
        }]);

        const template = adminLinkHandler.listTemplates(operator).find((entry) => entry.id === "link-report");
        expect(template?.params).toEqual([{name: "period", description: undefined}]);
        expect(adminLinkHandler.resolveTemplate(operator, "link-report", {period: "2026-07"}))
            .toBe("/admin/reports/2026-07");
    });

    it("registers app templates and removes them by owner", () => {
        const {adminLinkHandler} = createAdminizer([]);
        adminLinkHandler.addTemplate({
            id: "orders-invoice",
            title: "Invoice",
            template: "/admin/orders/:id/invoice",
        }, "billing");

        expect(adminLinkHandler.resolveTemplate(operator, "orders-invoice", {id: "7"}))
            .toBe("/admin/orders/7/invoice");
        expect(adminLinkHandler.removeTemplate("orders-invoice", "other-app")).toBe(false);
        expect(adminLinkHandler.removeTemplate("orders-invoice", "billing")).toBe(true);
    });

    it("never exposes or opens a record removal page", () => {
        const {adminLinkHandler, uiMethodHandler} = createAdminizer(["delete-Test-model", "update-Test-model"]);
        adminLinkHandler.addTemplate({
            id: "test-remove",
            title: "Remove test record",
            template: "/admin/model/Test/remove/:id",
        });

        expect(adminLinkHandler.listTemplates(operator).map((entry) => entry.id)).not.toContain("test-remove");
        expect(() => uiMethodHandler.resolveNavigation(operator, {href: "/admin/model/Test/remove/1"}))
            .toThrow(/cannot be opened/);
    });
});

describe("assistant navigation", () => {
    it("searches links and templates the user can reach", () => {
        const {uiMethodHandler} = createAdminizer(["update-Test-model", "read-Test-model"], [{
            id: "Test",
            title: "Test",
            link: "/admin/model/Test",
            accessRightsToken: "read-Test-model",
            actions: null,
        }]);

        const found = uiMethodHandler.searchAdminLinks(operator, "test");
        expect(found.find((entry) => entry.link === "/admin/model/Test")).toBeTruthy();

        const template = found.find((entry) => entry.id === "model-Test-edit");
        expect(template?.template).toBe("/admin/model/Test/edit/:id");
        expect(template?.link).toBeUndefined();
    });

    it("accepts a template with params and rejects foreign or unresolved urls", () => {
        const {uiMethodHandler} = createAdminizer(["update-Test-model"]);

        expect(uiMethodHandler.resolveNavigation(operator, {template: "model-Test-edit", params: {id: "42"}}))
            .toBe("/admin/model/Test/edit/42");
        expect(uiMethodHandler.resolveNavigation(operator, {href: "/admin/model/Test"}))
            .toBe("/admin/model/Test");
        expect(() => uiMethodHandler.resolveNavigation(operator, {href: "https://example.com"}))
            .toThrow(/Adminizer-relative/);
        expect(() => uiMethodHandler.resolveNavigation(operator, {href: "/admin/model/Test/edit/:id"}))
            .toThrow(/is a template/);
        expect(() => uiMethodHandler.resolveNavigation(operator, {}))
            .toThrow(/href or template/);
    });
});
