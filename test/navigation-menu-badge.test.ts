import {describe, expect, it, vi} from "vitest";
import {Adminizer} from "../src/lib/Adminizer";
import {MenuHelper} from "../src/helpers/menuHelper";
import {listAccessibleMenuItems} from "../src/helpers/navigationAccessHelper";
import type {AdminpanelConfig} from "../src/interfaces/adminpanelConfig";
import type {Adminizer} from "../src/lib/Adminizer";
import type {User} from "../src/models/User";

const user = {id: 1, login: "admin", isAdministrator: true, groups: []} as unknown as User;

describe("sidebar menu badge", () => {
    it("keeps the badge of an additional link", () => {
        const helper = new MenuHelper({
            routePrefix: "/admin",
            navbar: {
                additionalLinks: [
                    {id: "inbox", title: "Inbox", link: "/admin/inbox", type: "self", badge: 3},
                    {id: "plain", title: "Plain", link: "/admin/plain", type: "self"},
                ],
            },
        } as unknown as AdminpanelConfig);
        const items = helper.getMenuItems(user);

        expect(items.find((item) => item.id === "inbox")?.badge).toBe(3);
        expect(items.find((item) => item.id === "plain")?.badge).toBeUndefined();
    });

    it("keeps the badge of an app admin link", async () => {
        const adminizer = {
            menuHelper: {getMenuItems: () => []},
            accessRightsHelper: {
                checkPermission: async () => true,
                checkAnyPermission: async () => true,
            },
            adminLinkHandler: {
                list: async () => [{
                    id: "page:inbox", type: "page", name: "inbox", title: "Inbox",
                    link: "/admin/inbox", badge: "12+", owner: "agentiz",
                }],
            },
        } as unknown as Adminizer;

        const menu = await listAccessibleMenuItems(adminizer, user);
        expect(menu).toHaveLength(1);
        expect(menu[0].badge).toBe("12+");
    });

    it("resolves a badge function per user, only for the items the user may open", async () => {
        const calls: string[] = [];
        const adminizer = {
            menuHelper: {
                getMenuItems: () => [
                    {
                        id: "inbox", title: "Inbox", link: "/admin/inbox", actions: null, accessRightsToken: "inbox",
                        badge: async (forUser: User) => {
                            calls.push(`inbox:${forUser.login}`);
                            return 3;
                        },
                    },
                    {
                        id: "secret", title: "Secret", link: "/admin/secret", actions: null, accessRightsToken: "secret",
                        badge: () => {
                            calls.push("secret");
                            return 9;
                        },
                    },
                ],
            },
            accessRightsHelper: {
                checkPermission: async (token: string) => token === "inbox",
                checkAnyPermission: async (tokens: string[]) => tokens.includes("inbox"),
            },
            adminLinkHandler: {
                list: async () => [{
                    id: "page:review", type: "page", name: "review", title: "Review", link: "/admin/review",
                    owner: "agentiz", badge: (forUser: User) => (forUser.isAdministrator ? "admin" : undefined),
                }],
            },
        } as unknown as Adminizer;

        const menu = await listAccessibleMenuItems(adminizer, user);

        expect(menu.map((item) => [item.id, item.badge])).toEqual([["inbox", 3], ["page:review", "admin"]]);
        // The hidden item's resolver never ran.
        expect(calls).toEqual(["inbox:admin"]);
    });

    it("renders no badge when a resolver throws, and logs it", async () => {
        const logged = vi.spyOn(Adminizer.logger, "error").mockImplementation((() => Adminizer.logger) as never);
        const adminizer = {
            menuHelper: {getMenuItems: () => []},
            accessRightsHelper: {
                checkPermission: async () => true,
                checkAnyPermission: async () => true,
            },
            adminLinkHandler: {
                list: async () => [{
                    id: "page:broken", type: "page", name: "broken", title: "Broken", link: "/admin/broken",
                    owner: "app", badge: () => {
                        throw new Error("boom");
                    },
                }],
            },
        } as unknown as Adminizer;

        const menu = await listAccessibleMenuItems(adminizer, user);
        expect(menu).toHaveLength(1);
        expect(menu[0].badge).toBeUndefined();
        expect(logged).toHaveBeenCalledTimes(1);
        expect(String(logged.mock.calls[0][0])).toContain('badge of "page:broken" failed');
        logged.mockRestore();
    });
});
