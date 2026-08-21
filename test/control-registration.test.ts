import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {Adminizer} from "../src/lib/Adminizer";
import {AbstractAdminizerApp, AppSetupContext} from "../src/lib/app-manager/AdminizerApp";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {getControlsOptions} from "../src/helpers/inertiaAddHelper";
import {withAssetVersion} from "../src/helpers/assetVersionHelper";
import type {Control} from "../src/lib/controls/Control";

describe("control registration", () => {
    const sequelizeConnections: Sequelize[] = [];

    afterEach(async () => {
        await Promise.all(sequelizeConnections.splice(0).map((orm) => orm.close()));
    });

    it("registers and disposes app-owned controls and assets", async () => {
        const previousEnvironment = process.env.ADMINIZER_ENV;
        delete process.env.ADMINIZER_ENV;

        try {
            const adminizer = createAdminizer();
            await adminizer.appManager.enable(new ControlOnlyApp());

            const control = adminizer.controlsHandler.get("wysiwyg", "react-quill");
            expect(control?.getJsPath()).toBe(
                "/admin/app-assets/control-only/editor/react-quill.js"
            );
            expect(control?.getCssPath()).toBe(
                "/admin/app-assets/control-only/editor-css/react-quill.css"
            );
            expect(adminizer.assetHandler.getByApp("control-only")).toHaveLength(2);
            expect(adminizer.controllerHandler.getByApp("control-only")).toHaveLength(2);

            await adminizer.appManager.disable("control-only");

            expect(adminizer.controlsHandler.get("wysiwyg", "react-quill")).toBeUndefined();
            expect(adminizer.assetHandler.getByApp("control-only")).toHaveLength(0);
            expect(adminizer.controllerHandler.getByApp("control-only")).toHaveLength(0);
        } finally {
            if (previousEnvironment === undefined) {
                delete process.env.ADMINIZER_ENV;
            } else {
                process.env.ADMINIZER_ENV = previousEnvironment;
            }
        }
    });

    it("falls back to the default control and warns once", () => {
        const adminizer = createAdminizer();
        adminizer.controlsHandler.add(createControl("ckeditor", {toolbar: "default"}));
        const warn = vi.spyOn(Adminizer.logger, "warn").mockImplementation(() => Adminizer.logger);

        try {
            const fieldConfig = {
                options: {
                    name: "missing-editor",
                    config: {
                        theme: "snow",
                    },
                },
            } as any;
            const req = {adminizer} as ReqType;

            const first = getControlsOptions(
                fieldConfig,
                req,
                "wysiwyg",
                "ckeditor",
                "Example.editor"
            );
            const second = getControlsOptions(
                fieldConfig,
                req,
                "wysiwyg",
                "ckeditor",
                "Example.editor"
            );

            expect(first).toEqual({
                name: "ckeditor",
                config: {toolbar: "default"},
                // Control entry names are stable, so the paths handed to the page
                // carry the adminizer version as a cache-busting query.
                path: withAssetVersion("/controls/ckeditor.js"),
                cssPath: withAssetVersion("/controls/ckeditor.css"),
            });
            expect(second).toEqual(first);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(
                'Control "missing-editor" for Example.editor is unavailable; falling back to "ckeditor".'
            );
        } finally {
            warn.mockRestore();
        }
    });

    function createAdminizer(): Adminizer {
        const orm = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: false,
        });
        sequelizeConnections.push(orm);

        const adminizer = new Adminizer([new SequelizeAdapter(orm)]);
        adminizer.config = {
            routePrefix: "/admin",
            models: {},
            system: {
                defaultORM: "sequelize",
            },
        } as any;
        return adminizer;
    }
});

class ControlOnlyApp extends AbstractAdminizerApp {
    readonly name = "control-only";
    readonly version = "1.0.0";

    setup(ctx: AppSetupContext): void {
        ctx.control({
            type: "wysiwyg",
            name: "react-quill",
            config: {
                theme: "snow",
            },
            component: {
                id: "editor",
                filePath: "react-quill.js",
                devUrl: "/dev/react-quill.js",
            },
            stylesheet: {
                id: "editor-css",
                filePath: "react-quill.css",
                devUrl: "/dev/react-quill.css",
            },
        });
    }
}

function createControl(name: string, config: Record<string, string>): Control {
    return {
        name,
        type: "wysiwyg",
        getName: () => name,
        getConfig: () => config,
        getJsPath: () => `/controls/${name}.js`,
        getCssPath: () => `/controls/${name}.css`,
    };
}
