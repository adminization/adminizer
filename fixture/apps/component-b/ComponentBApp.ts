import path from "path";
import {
    AbstractAdminizerApp,
    AdminpanelIcon,
    AppSetupContext,
    UserAP,
} from "../../../dist";

interface ComponentBAppConfig {
    route: string;
    sidebarId: string;
    title: string;
    icon: AdminpanelIcon;
    section: string;
    componentFile: string;
    devComponentUrl: string;
}

export class ComponentBApp extends AbstractAdminizerApp<ComponentBAppConfig> {
    readonly name = "component-b";
    readonly version = "1.0.0";
    declare readonly config: ComponentBAppConfig;

    constructor(config: Partial<ComponentBAppConfig> = {}) {
        super();
        this.config = {
            route: "/module-test",
            sidebarId: "component-b",
            title: "Test Module",
            icon: "360",
            section: "Platform",
            componentFile: path.resolve(import.meta.dirname, "ComponentB.es.js"),
            devComponentUrl: "/fixture/apps/component-b/ComponentB.tsx",
            ...config,
        };
    }

    setup(ctx: AppSetupContext): void {
        ctx.modelAccess({
            id: "users",
            models: ["UserAP"],
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
            policies: [{type: "auth", mode: "ui"}],
        });

        ctx.controller({
            id: "send-notification",
            method: "post",
            route: this.config.route,
            middleware: this.sendNotification,
            policies: [{type: "auth", mode: "api"}],
        });

        ctx.config({
            navbar: {
                additionalLinks: [{
                    id: this.config.sidebarId,
                    link: pageUrl,
                    type: "self",
                    title: this.config.title,
                    icon: this.config.icon,
                    section: this.config.section,
                }],
            },
        });
    }

    private renderModule(moduleComponent: string): MiddlewareType {
        return async (req, res) => {
            const users = await req.runtime.models.get<UserAP>("UserAP").find({});

            return req.Inertia.render({
                component: "module",
                props: {
                    moduleComponent,
                    data: {
                        users,
                    },
                },
            });
        };
    }

    private sendNotification: MiddlewareType = async (req, res) => {
        const rawUserId = req.body.userId;
        const userId = req.body.sendToAll ? undefined : Number(rawUserId);

        if (!req.body.sendToAll && (!Number.isInteger(userId) || userId <= 0)) {
            return res.status(400).json({
                error: "Invalid userId",
            });
        }

        await req.runtime.notifications.send({
            title: "Test notification",
            message: req.body.message,
            notificationClass: "general",
            channel: "",
            ...(userId ? {userId} : {}),
        });

        return res.json({
            test: req.body,
        });
    };
}
