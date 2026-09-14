import {describe, expect, it} from "vitest";
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
});
