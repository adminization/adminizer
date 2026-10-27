import {describe, expect, it, onTestFinished, vi} from "vitest";
import {ListQueryBuilder} from "../src/lib/list-query-builder/ListQueryBuilder";
import {getVisibleFields} from "../src/helpers/fieldsHelper";
import {ControllerHelper} from "../src/helpers/controllerHelper";
import {FeedService} from "../src/services/FeedService";

const record = {
    id: 1,
    login: "admin",
    passwordHashed: "sha1$salt$1$hash",
    apiKey: "11111111-2222-3333-4444-555555555555",
};

const model = {
    primaryKey: "id",
    attributes: {
        id: {type: "number"},
        login: {type: "string"},
        passwordHashed: {type: "string"},
        apiKey: {type: "string"},
    },
    find: async () => [{...record}],
    count: async () => 1,
} as any;

const fields = {
    id: {config: {title: "id", visible: false}, model: {type: "number"}},
    login: {config: {title: "login"}, model: {type: "string"}},
    passwordHashed: {config: {title: "passwordHashed", visible: false}, model: {type: "string"}},
    apiKey: {config: {title: "apiKey", visible: false}, model: {type: "string"}},
} as any;

describe("ListQueryBuilder rows", () => {
    it("leave out fields hidden with visible: false", async () => {
        const builder = new ListQueryBuilder(model, fields, {} as any);
        const result = await builder.execute({page: 1, limit: 10});
        expect(result.data).toEqual([{id: 1, login: "admin"}]);
    });

    it("carry exactly the fields the caller asked for", async () => {
        const builder = new ListQueryBuilder(model, fields, {} as any);
        const result = await builder.execute({page: 1, limit: 10, fields: ["login", "apiKey", "unknown"]});
        expect(result.data).toEqual([{id: 1, login: "admin", apiKey: record.apiKey}]);
    });
});

describe("getVisibleFields", () => {
    it("keeps the fields that are not hidden, list and export pick from them", () => {
        expect(Object.keys(getVisibleFields(fields))).toEqual(["login"]);
    });
});

describe("FeedService", () => {
    it("keeps fields hidden in the list config out of the feed", async () => {
        const modelResource = {
            name: "User",
            model,
            config: {
                fields: {login: {title: "User login"}},
                list: {fields: {id: {visible: false}, passwordHashed: {visible: false}, apiKey: {visible: false}}},
            },
        };
        const findModelResource = vi.spyOn(ControllerHelper, "findModelResource").mockReturnValue(modelResource as any);
        onTestFinished(() => findModelResource.mockRestore());
        const adminizer = {config: {models: {}, routePrefix: "/admin"}} as any;
        const feed = await new FeedService(adminizer).generateJsonFeed(
            {id: "f1", name: "Users", modelName: "User", apiKey: "feed-key"} as any,
            adminizer,
            {id: 1, isAdministrator: true} as any,
        );
        const dump = JSON.stringify(feed);
        expect(dump).toContain("admin");
        expect(dump).not.toContain(record.passwordHashed);
        expect(dump).not.toContain(record.apiKey);
    });
});
