import path from "path";
import {AbstractAdminizerApp, AppSetupContext} from "../../../dist";
import {Test} from "../../models/sequelize/Test";

export const RECORD_SCOPE_TEST_TOKEN = "record-scope-test";

interface RecordScopeTestAppConfig {
    route: string;
    sidebarId: string;
    title: string;
    icon: string;
    section: string;
    componentFile: string;
    devComponentUrl: string;
}

export class RecordScopeTestApp extends AbstractAdminizerApp<RecordScopeTestAppConfig> {
    readonly name = "record-scope-test";
    readonly version = "1.0.0";
    declare readonly config: RecordScopeTestAppConfig;

    constructor(config: Partial<RecordScopeTestAppConfig> = {}) {
        super();
        this.config = {
            route: "/record-scope-test",
            sidebarId: "record-scope-test",
            title: "Record scope test",
            icon: "security",
            section: "Fixture",
            componentFile: path.resolve(import.meta.dirname, "RecordScopeTest.es.js"),
            devComponentUrl: "/fixture/apps/record-scope-test/RecordScopeTest.tsx",
            ...config,
        };
    }

    setup(ctx: AppSetupContext): void {
        ctx.accessRight({
            id: RECORD_SCOPE_TEST_TOKEN,
            name: "Test record access",
            description: "Access to individually selected Test records",
            department: "Fixture",
            getOptions: async () => {
                const records = await Test.findAll();
                return records.map((record) => ({
                    id: String(record.id),
                    name: String(record.title ?? record.id),
                }));
            },
            check: async (_user, context) => {
                const testId = context?.testId;
                return typeof testId === "string" || typeof testId === "number"
                    ? context?.rights?.includes(String(testId)) ?? false
                    : false;
            },
        });

        ctx.modelAccess({models: ["Test"]});

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
                    title: this.config.title,
                    type: "self",
                    link: pageUrl,
                    icon: this.config.icon as any,
                    section: this.config.section,
                }],
            },
        });
    }

    private renderModule(moduleComponent: string): MiddlewareType {
        return async (req, res) => {
            const records = await req.runtime.models.get<Record<string, unknown>>("Test").find();
            const availableTests = (await Promise.all(records.map(async (record) => ({
                record,
                allowed: await req.runtime.accessRights.hasPermission(
                    RECORD_SCOPE_TEST_TOKEN,
                    req.user,
                    { testId: String(record.id) },
                ),
            })))).filter(({allowed}) => allowed).map(({record}) => ({
                id: String(record.id),
                title: String(record.title ?? record.id),
            }));

            return req.Inertia.render({
                component: "module",
                props: {
                    moduleComponent,
                    data: {available: availableTests.length > 0, availableTests},
                },
            });
        };
    }
}
