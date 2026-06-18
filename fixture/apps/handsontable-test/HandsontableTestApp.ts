import path from "path";
import {AbstractAdminizerApp, AppSetupContext} from "../../../dist";

interface HandsontableTestAppConfig {
    route: string;
    sidebarId: string;
    title: string;
    icon: string;
    section: string;
    componentFile: string;
    devComponentUrl: string;
}

export class HandsontableTestApp extends AbstractAdminizerApp<HandsontableTestAppConfig> {
    readonly name = "handsontable-test";
    readonly version = "1.0.0";
    declare readonly config: HandsontableTestAppConfig;

    constructor(config: Partial<HandsontableTestAppConfig> = {}) {
        super();
        this.config = {
            route: "/handsontable-test",
            sidebarId: "handsontable-test",
            title: "Handsontable Test",
            icon: "table_chart",
            section: "Platform",
            componentFile: path.resolve(import.meta.dirname, "HandsontableTest.es.js"),
            devComponentUrl: "/fixture/apps/handsontable-test/HandsontableTest.tsx",
            ...config,
        };
    }

    setup(ctx: AppSetupContext): void {
        const moduleComponent = ctx.asset({
            id: "component",
            filePath: this.config.componentFile,
            devUrl: this.config.devComponentUrl,
        });

        const pageUrl = ctx.controller({
            id: "page",
            method: "get",
            route: this.config.route,
            middleware: this.renderModule(moduleComponent),
            policies: [{type: "auth", mode: "ui"}],
        });

        ctx.config({
            navbar: {
                additionalLinks: [{
                    id: this.config.sidebarId,
                    link: pageUrl,
                    type: "self",
                    title: this.config.title,
                    icon: this.config.icon as any,
                    section: this.config.section,
                }],
            },
        });
    }

    private renderModule(moduleComponent: string): MiddlewareType {
        return async (req, res) => {
            return req.Inertia.render({
                component: "module",
                props: {
                    moduleComponent,
                    data: {},
                },
            });
        };
    }
}
