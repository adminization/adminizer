import {describe, expect, it, vi} from "vitest";
import {ControllerHelper} from "../src/helpers/controllerHelper";
import {DataAccessor} from "../src/lib/DataAccessor";
import {ModelHandler} from "../src/lib/model/ModelHandler";
import bindAccessRights from "../src/system/bindAccessRights";
import {buildInternalModelAccess} from "../src/system/buildInternalModelAccess";

describe("model resource aliases", () => {
    it("keeps system resources and project host models in separate indexes", () => {
        const handler = new ModelHandler();
        const systemUser = {modelname: "User", attributes: {}} as any;
        const customer = {modelname: "User", attributes: {}} as any;

        handler.add("User", systemUser, {hostModelName: "UserAP", aliases: ["UserAP"]});
        handler.add("Customer", customer, {hostModelName: "User", primary: true});

        expect(handler.getResource("User")).toBe(systemUser);
        expect(handler.getResource("Customer")).toBe(customer);
        expect(handler.getByHostModel("UserAP")).toBe(systemUser);
        expect(handler.getByHostModel("User")).toBe(customer);
        expect(handler.resolveAssociationResource("User")).toBe("Customer");
        expect(handler.resolveAssociationResource("User", "User")).toBe("User");
        expect(handler.resolveResourceByHostModel("user")).toBe("Customer");
        const customer2 = {modelname: "User", attributes: {}} as any;
        handler.add("Customer2", customer2, {hostModelName: "User"});
        handler.validateHostModelMappings();
        expect(handler.getResource("Customer2")).toBe(customer2);
        expect(handler.getByHostModel("User")).toBe(customer);

        const ambiguous = new ModelHandler();
        ambiguous.add("Customer", customer, {hostModelName: "User"});
        ambiguous.add("Customer2", customer2, {hostModelName: "User"});
        expect(() => ambiguous.validateHostModelMappings())
            .toThrow('Host model "User" is mapped to multiple Adminizer resources: Customer, Customer2. Configure exactly one with primary: true.');
    });

    it("uses the configured resource name for CRUD lookup and permissions", async () => {
        const modelHandler = new ModelHandler();
        const systemUser = {modelname: "User", attributes: {}} as any;
        const customer = {modelname: "User", attributes: {}} as any;
        modelHandler.add("User", systemUser, {hostModelName: "UserAP"});
        modelHandler.add("Customer", customer, {hostModelName: "User", primary: true});

        const config = {
            routePrefix: "/adminizer",
            auth: {enable: false},
            models: {
                User: {model: "User", title: "System users"},
                Customer: {model: "User", title: "Customers"},
            },
        } as any;
        const adminizer = {
            config,
            modelHandler,
            accessRightsHelper: {hasStaticPermission: vi.fn(() => true)},
        } as any;

        const resource = ControllerHelper.findModelResource({
            params: {modelResourceName: "Customer"},
            adminizer,
            originalUrl: "/adminizer/model/Customer",
        } as any);

        expect(resource.name).toBe("Customer");
        expect(resource.model).toBe(customer);

        const accessor = new DataAccessor(adminizer, {isAdministrator: true} as any, resource, "list");
        accessor.getFieldsConfig();
        // DataAccessor emits token ids in their canonical lowercase form
        expect(adminizer.accessRightsHelper.hasStaticPermission).toHaveBeenCalledWith("read-customer-model", expect.anything());

        const registerModelTokens = vi.fn();
        await bindAccessRights({
            config,
            accessRightsHelper: {registerModelTokens, registerToken: vi.fn()},
        } as any);
        expect(registerModelTokens).toHaveBeenCalledWith("User");
        expect(registerModelTokens).toHaveBeenCalledWith("Customer");
    });

    it("puts membership models in the internal allowlist under the exact names the resolver queries", () => {
        const modelHandler = new ModelHandler();
        // Project resources shadow the "User" and "Group" host models: host-model-first
        // resolution would yield "Customer"/"Team", but the membership resolver queries
        // the through model by resource name and the group narrowing the literal "Group".
        modelHandler.add("User", {modelname: "User", attributes: {}} as any, {hostModelName: "UserAP"});
        modelHandler.add("Customer", {modelname: "User", attributes: {}} as any, {hostModelName: "User", primary: true});
        modelHandler.add("Group", {modelname: "Group", attributes: {}} as any, {hostModelName: "GroupAP"});
        modelHandler.add("Team", {modelname: "Group", attributes: {}} as any, {hostModelName: "Group", primary: true});
        modelHandler.add("Deal", {modelname: "Deal", attributes: {}} as any);

        const config = {
            models: {
                Deal: {userAccessRelation: {field: "customer", through: "User", via: "owner", group: "grp"}},
            },
            accessGraph: {
                deal: {root: "Deal", membership: {through: "User", via: "owner", group: "grp"}},
            },
        } as any;

        const accessMap = buildInternalModelAccess(config, modelHandler)!;
        expect(accessMap["data-accessor"]).toContain("User");
        expect(accessMap["data-accessor"]).toContain("Group");
        expect(accessMap["data-accessor"]).not.toContain("Customer");
        expect(accessMap["data-accessor"]).not.toContain("Team");
    });
});
