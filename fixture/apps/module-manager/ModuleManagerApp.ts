import path from "path";
import {AbstractAdminizerApp, AppSetupContext} from "../../../dist";

const MODULE_MANAGER_ACCESS_TOKEN = "module-manager";

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
        ctx.accessRight({
            id: MODULE_MANAGER_ACCESS_TOKEN,
            name: "Module manager",
            description: "Access to module manager",
            department: "Modules",
        });

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
            policies: [{type: "permission", token: MODULE_MANAGER_ACCESS_TOKEN, mode: "ui"}],
        });

        ctx.controller({
            id: "enable",
            method: "post",
            route: `${this.config.route}/enable`,
            middleware: this.enableModule,
            policies: [{type: "permission", token: MODULE_MANAGER_ACCESS_TOKEN, mode: "api"}],
        });

        ctx.controller({
            id: "disable",
            method: "post",
            route: `${this.config.route}/disable`,
            middleware: this.disableModule,
            policies: [{type: "permission", token: MODULE_MANAGER_ACCESS_TOKEN, mode: "api"}],
        });

        ctx.controller({
            id: "unregister",
            method: "post",
            route: `${this.config.route}/unregister`,
            middleware: this.unregisterModule,
            policies: [{type: "permission", token: MODULE_MANAGER_ACCESS_TOKEN, mode: "api"}],
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
                        accessRightsToken: MODULE_MANAGER_ACCESS_TOKEN,
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

    private unregisterModule: MiddlewareType = async (req, res) => {
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({error: "Name is required"});
        }

        if (name === "module-manager") {
            return res.status(400).json({error: "Модуль 'module-manager' нельзя удалить"});
        }

        try {
            await req.adminizer.appManager.unregister(name);
            
            // Логирование для проверки состояния после удаления
            console.log('--- Проверка состояния после удаления модуля:', name, '---');
            console.log('Список установленных приложений:', req.adminizer.appManager.getInstalledApps());
            console.log('Состояние модуля:', req.adminizer.appManager.getState(name));
            console.log('Объект модуля:', req.adminizer.appManager.getApp(name));
            console.log('Контроллеры модуля:', req.adminizer.controllerHandler.getByApp(name));
            console.log('Ассеты модуля:', req.adminizer.assetHandler.getByApp(name));
            console.log('Конфигурация модуля:', req.adminizer.configLayerHandler.getByApp(name));
            console.log('--- Проверка завершена ---');
            
            return res.json({
                success: true
            })
        } catch (error) {
            req.flash.setFlashMessage('error', `Ошибка при удалении модуля ${name}.`);
            return res.status(500).json({error: error.message});
        }
    };
}
