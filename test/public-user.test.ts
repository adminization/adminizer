import {describe, expect, it} from "vitest";
import {toPublicUser} from "../src/helpers/publicUserHelper";

describe("toPublicUser", () => {
    it("drops the password hash and the API key", () => {
        const user = {
            id: 1,
            login: "admin",
            isAdministrator: true,
            groups: [{id: 2, name: "editors", tokens: ["read"]}],
            passwordHashed: "sha1$salt$1$hash",
            apiKey: "11111111-2222-3333-4444-555555555555",
        };
        const publicUser = toPublicUser(user);
        expect(publicUser).toEqual({
            id: 1,
            login: "admin",
            isAdministrator: true,
            groups: [{id: 2, name: "editors", tokens: ["read"]}],
        });
        expect(user.passwordHashed).toBe("sha1$salt$1$hash");
        expect(user.apiKey).toBeDefined();
    });

    it("keeps an anonymous visitor anonymous", () => {
        expect(toPublicUser(undefined)).toBeNull();
        expect(toPublicUser(null)).toBeNull();
    });
});
