import path from "path";
import {AbstractAdminizerApp, AppSetupContext} from "../../../dist";

interface WidgetsAppConfig {
    customWidgetFile: string;
    customWidgetDevUrl: string;
    linkUrl: string;
}

export class WidgetsApp extends AbstractAdminizerApp<WidgetsAppConfig> {
    readonly name = "widgets";
    readonly version = "1.0.0";
    declare readonly config: WidgetsAppConfig;
    private switcherState = false;
    private actionCount = 0;

    constructor(config: Partial<WidgetsAppConfig> = {}) {
        super();
        this.config = {
            customWidgetFile: path.resolve(import.meta.dirname, "CustomWidget.es.js"),
            customWidgetDevUrl: "/fixture/apps/widgets/CustomWidget.tsx",
            linkUrl: "/",
            ...config,
        };
    }

    setup(ctx: AppSetupContext): void {
        ctx.widget({
            id: "app_info_widget",
            type: "info",
            name: "App Info",
            description: "Info widget from app",
            icon: "info",
            department: "App Widgets",
            backgroundCSS: "#4b5563",
            size: {h: 1, w: 1},
            getInfo: ({runtime}) => `${runtime.apps.list().length} apps`,
        });

        ctx.widget({
            id: "app_switcher_widget",
            type: "switcher",
            name: "App Switcher",
            description: "Switcher widget from app",
            icon: "toggle_on",
            department: "App Widgets",
            backgroundCSS: "#0f766e",
            size: {h: 1, w: 1},
            getState: () => this.switcherState,
            switchIt: () => {
                this.switcherState = !this.switcherState;
                return this.switcherState;
            },
        });

        ctx.widget({
            id: "app_action_widget",
            type: "action",
            name: "App Action",
            description: "Action widget from app",
            icon: "touch_app",
            department: "App Widgets",
            backgroundCSS: "#7c3aed",
            size: {h: 1, w: 1},
            action: async () => {
                await this.delay(1500);
                this.actionCount++;
                return {count: this.actionCount};
            },
        });

        ctx.widget({
            id: "app_link_widget",
            type: "link",
            name: "App Links",
            description: "Link widget from app",
            icon: "link",
            department: "App Widgets",
            backgroundCSS: "#2563eb",
            size: {h: 1, w: 1},
            links: [{
                name: "App Link",
                description: "Fixture home page",
                icon: "home",
                link: this.config.linkUrl,
                linkType: "self",
                backgroundCSS: "#2563eb",
            }],
        });

        ctx.widget({
            id: "app_custom_counter",
            type: "custom",
            name: "App Custom Counter",
            description: "Custom widget from app",
            icon: "add_circle",
            department: "App Widgets",
            backgroundCSS: "#d7d4d4",
            size: {h: 2, w: 2},
            component: {
                id: "custom-counter",
                filePath: this.config.customWidgetFile,
                devUrl: this.config.customWidgetDevUrl,
            },
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
