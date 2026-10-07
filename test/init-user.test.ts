import {describe, expect, it, vi} from "vitest";

vi.mock("../src/lib/Adminizer", () => ({
    Adminizer: {log: {debug: vi.fn(), error: vi.fn()}},
}));
vi.mock("../src/helpers/inertiaAutHelper", () => ({
    inertiaInitUserHelper: () => ({}),
}));

import initUser from "../src/controllers/initUser";

function makeContext(method: string, admins: unknown[], body: Record<string, string> = {}) {
    const userModel = {
        find: vi.fn().mockResolvedValue(admins),
        create: vi.fn().mockResolvedValue({}),
    };
    const req: any = {
        method,
        body,
        adminizer: {
            config: {auth: {enable: true}, routePrefix: "/admin"},
            modelHandler: {internal: () => ({get: () => userModel})},
        },
        Inertia: {render: vi.fn(), redirect: vi.fn()},
    };
    const res: any = {redirect: vi.fn()};
    return {req, res, userModel};
}

describe("initUser controller", () => {
    it("GET with an existing administrator only redirects to login and does not render the wizard", async () => {
        const {req, res} = makeContext("GET", [{id: 1}]);
        await initUser(req, res);
        expect(res.redirect).toHaveBeenCalledTimes(1);
        expect(res.redirect).toHaveBeenCalledWith("/admin/model/User/login");
        expect(req.Inertia.render).not.toHaveBeenCalled();
    });

    it("POST with an existing administrator does not create another administrator", async () => {
        const {req, res, userModel} = makeContext("POST", [{id: 1}], {
            login: "intruder", password: "secret", confirmPassword: "secret",
        });
        await initUser(req, res);
        expect(res.redirect).toHaveBeenCalledWith("/admin/model/User/login");
        expect(userModel.create).not.toHaveBeenCalled();
        expect(req.Inertia.render).not.toHaveBeenCalled();
        expect(req.Inertia.redirect).not.toHaveBeenCalled();
    });

    it("GET without administrators renders the wizard", async () => {
        const {req, res} = makeContext("GET", []);
        await initUser(req, res);
        expect(res.redirect).not.toHaveBeenCalled();
        expect(req.Inertia.render).toHaveBeenCalledWith(expect.objectContaining({component: "init-user"}));
    });

    it("POST without administrators creates the first administrator", async () => {
        const {req, res, userModel} = makeContext("POST", [], {
            login: "admin", password: "secret", confirmPassword: "secret",
        });
        await initUser(req, res);
        expect(userModel.create).toHaveBeenCalledTimes(1);
        expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({login: "admin", isAdministrator: true}));
        expect(req.Inertia.redirect).toHaveBeenCalledWith("/admin");
    });
});
