import path from "path";
import {AbstractAdminizerApp, AppSetupContext} from "../../../dist";

interface ModuleManagerAppConfig {
    route: string;
    sidebarId: string;
    title: string;
    icon: string;
    section: string;
    componentFile: string;
    devComponentUrl: string;
}

export class ModuleManagerApp extends AbstractAdminizerApp<ModuleManagerAppConfig> {
    readonly name = "module-manager";
    readonly version = "1.0.0";
    declare readonly config: ModuleManagerAppConfig;

    constructor(config: Partial<ModuleManagerAppConfig> = {}) {
        super();
        this.config = {
            route: "/module-manager",
            sidebarId: "module-manager",
            title: "Менеджер модулей",
            icon: "settings",
            section: "Platform",
            componentFile: path.resolve(import.meta.dirname, "ModuleManager.es.js"),
            devComponentUrl: "/fixture/apps/module-manager/ModuleManager.tsx",
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

        ctx.controller({
            id: "enable",
            method: "post",
            route: `${this.config.route}/enable`,
            middleware: this.enableModule,
            policies: [{type: "auth", mode: "api"}],
        });

        ctx.controller({
            id: "disable",
            method: "post",
            route: `${this.config.route}/disable`,
            middleware: this.disableModule,
            policies: [{type: "auth", mode: "api"}],
        });

        ctx.config({
            navbar: {
                additionalLinks: [
                    {
                        id: this.config.sidebarId,
                        link: pageUrl,
                        type: "self",
                        title: this.config.title,
                        icon: this.config.icon as any,
                        section: this.config.section,
                    },
                ],
            },
        });
    }

    private renderModule(moduleComponent: string): MiddlewareType {
        return async (req, res) => {
            const installedApps = req.adminizer.appManager.getInstalledApps().map(name => ({
                name,
                app: req.adminizer.appManager.getApp(name),
                state: req.adminizer.appManager.getState(name)
            }));

            const modules = installedApps
                .filter(({name}) => name !== "module-manager")
                .map(({name, app, state}) => ({
                    name,
                    version: app?.version || "unknown",
                    state: state || "unknown"
                }));

            return req.Inertia.render({
                component: "module",
                props: {
                    moduleComponent,
                    data: {
                        modules
                    },
                },
            });
        };
    }

    private enableModule: MiddlewareType = async (req, res) => {
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({error: "Name is required"});
        }

        if (name === "module-manager") {
            return res.status(400).json({error: "Модуль 'module-manager' нельзя включить через этот интерфейс"});
        }

        try {
            await req.adminizer.appManager.enable(name);
            return res.json({
                success: true,
            });
        } catch (error) {
            req.flash.setFlashMessage('error', `Ошибка при включении модуля ${name}.`);
            return res.status(500).json({error: error.message});
        }
    };

    private disableModule: MiddlewareType = async (req, res) => {
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({error: "Name is required"});
        }

        if (name === "module-manager") {
            return res.status(400).json({error: "Модуль 'module-manager' нельзя отключить"});
        }

        try {
            await req.adminizer.appManager.disable(name);
            return res.json({
                success: true
            })
        } catch (error) {
            req.flash.setFlashMessage('error', `Ошибка при выключении модуля ${name}.`);
            return res.status(500).json({error: error.message});
        }
    };
}
