import {describe, expect, it} from "vitest";
import {AccessRightsHelper} from "../src/helpers/accessRightsHelper";

function createHelper(authEnabled = true) {
    const helper = new AccessRightsHelper({
        config: {auth: {enable: authEnabled}},
    } as any);
    helper.registerToken({
        id: "record-scope-test",
        name: "Test record access",
        description: "Access to selected Test records",
        department: "Fixture",
        getOptions: async () => [],
        check: async (_user, context) => context?.rights?.includes(String(context?.testId)) ?? false,
    });
    return helper;
}

describe("contextual access rights", () => {
    it("merges rights from every user group and checks trusted rights", async () => {
        const helper = createHelper();
        const user = {
            isAdministrator: false,
            groups: [
                {tokens: [{tokenId: "record-scope-test", rights: ["a", "b"]}]},
                {tokens: [{tokenId: "record-scope-test", rights: ["b", "c"]}]},
            ],
        } as any;

        expect(helper.getPermissionRights("record-scope-test", user)).toEqual(["a", "b", "c"]);
        expect(await helper.hasPermission("record-scope-test", user, {testId: "b", rights: ["client-value"]})).toBe(true);
        expect(await helper.hasPermission("record-scope-test", user, {testId: "missing", rights: ["missing"]})).toBe(false);
    });

    it("returns null for unrestricted access", () => {
        const helper = createHelper();
        expect(helper.getPermissionRights("record-scope-test", {isAdministrator: true} as any)).toBeNull();
        expect(createHelper(false).getPermissionRights("record-scope-test", {isAdministrator: false} as any)).toBeNull();
    });

    it("denies access when a token callback fails", async () => {
        const helper = createHelper();
        helper.registerToken({
            id: "failing-token",
            name: "Failing token",
            description: "Fails during permission check",
            department: "Fixture",
            check: async () => {
                throw new Error("Unexpected failure");
            },
        });

        const user = {
            isAdministrator: false,
            groups: [{tokens: ["failing-token"]}],
        } as any;

        expect(await helper.hasPermission("failing-token", user, {})).toBe(false);
    });

    it("runs a token callback even without a context object", async () => {
        const helper = createHelper();
        let checked = false;
        helper.registerToken({
            id: "user-only-token",
            name: "User-only token",
            description: "Checks access from user data only",
            department: "Fixture",
            check: async (_user, context) => {
                checked = true;
                return context?.rights?.includes("allowed") ?? false;
            },
        });

        const user = {
            isAdministrator: false,
            groups: [{tokens: [{tokenId: "user-only-token", rights: ["allowed"]}]}],
        } as any;

        expect(await helper.hasPermission("user-only-token", user)).toBe(true);
        expect(checked).toBe(true);
    });
});
