import {describe, expect, it, vi} from "vitest";
import inertiaAddHelper from "../src/helpers/inertiaAddHelper";
import {ModelHandler} from "../src/lib/model/ModelHandler";

/**
 * The "+ Add" / open-item buttons of an association field open
 * `${routePrefix}/model/${relatedModel}/add`. `relatedModel` has to be the Adminizer
 * resource that owns the host ORM model of the association, even when the host model
 * name collides with a system resource (RestoCore: dish.parentGroup -> host "group",
 * exposed as resource "DishGroup", while "Group" is the system user-groups resource).
 */
describe("inertiaAddHelper related model of association fields", () => {
    const makeReq = (modelHandler: ModelHandler) => ({
        i18n: {__: (s: string) => s},
        user: {id: 1, isAdministrator: true},
        adminizer: {
            config: {routePrefix: "/admin", auth: {enable: true}, models: {}},
            modelHandler,
            menuHelper: {hasGlobalActions: () => false},
            configHelper: {getConfig: () => ({showORMtime: false}), isId: () => false},
            accessRightsHelper: {checkPermission: vi.fn(async () => true)},
        },
    }) as any;

    const associationField = (hostModel: string) => ({
        config: {type: "association", title: "Parent Group", visible: true, records: []},
        model: {type: "association", model: hostModel},
        modelConfig: {},
        populated: undefined,
    }) as any;

    it("resolves the host model to its project resource, not to a same-named system resource", async () => {
        const modelHandler = new ModelHandler();
        modelHandler.add("User", {modelname: "UserAP", attributes: {}} as any, {hostModelName: "UserAP"});
        modelHandler.add("Group", {modelname: "GroupAP", attributes: {}} as any, {hostModelName: "GroupAP"});
        modelHandler.add("Customer", {modelname: "user", attributes: {}} as any, {hostModelName: "user"});
        modelHandler.add("DishGroup", {modelname: "group", attributes: {}} as any, {hostModelName: "group"});

        const req = makeReq(modelHandler);
        const props = await inertiaAddHelper(
            req,
            {name: "dish", uri: "/admin/model/dish", config: {}, model: {}} as any,
            {parentGroup: associationField("group"), owner: associationField("user")},
        );

        const byName = Object.fromEntries(props.fields.map((f: any) => [f.name, f]));
        expect(byName.parentGroup.relatedModel).toBe("DishGroup");
        expect(byName.owner.relatedModel).toBe("Customer");
        expect(req.adminizer.accessRightsHelper.checkPermission)
            .toHaveBeenCalledWith("create-DishGroup-model", req.user);
    });

    it("honours an explicit resourceName of a system-model relation", async () => {
        const modelHandler = new ModelHandler();
        modelHandler.add("Group", {modelname: "GroupAP", attributes: {}} as any, {hostModelName: "GroupAP"});
        modelHandler.add("DishGroup", {modelname: "group", attributes: {}} as any, {hostModelName: "group"});

        const field = associationField("GroupAP");
        field.model.resourceName = "Group";
        const props = await inertiaAddHelper(
            makeReq(modelHandler),
            {name: "User", uri: "/admin/model/User", config: {}, model: {}} as any,
            {groups: field},
        );

        expect(props.fields[0].relatedModel).toBe("Group");
    });
});
