import {AbstractAdminizerApp, AppSetupContext, NavigationConfig} from "../../../dist";
import {navigationModelName, navigationSchema} from "./NavigationModel";

export interface NavigationAppConfig extends Omit<NavigationConfig, "model"> {
    model?: string;
    sync?: boolean;
}

export class NavigationApp extends AbstractAdminizerApp<NavigationAppConfig> {
    readonly name = "navigation";
    readonly version = "1.0.0";
    declare readonly config: NavigationAppConfig;

    constructor(config: NavigationAppConfig) {
        super();
        this.config = {
            ...config,
            model: config.model ?? navigationModelName,
        };
    }

    setup(ctx: AppSetupContext): void {
        ctx.accessRight({
            id: "catalog-navigation",
            name: "Navigation",
            description: "Access to edit navigation catalogs",
            department: "Catalog",
        });

        ctx.model({
            name: this.config.model,
            schema: navigationSchema,
            sync: this.config.sync,
        });

        ctx.modelAccess({
            models: [
                this.config.model,
                ...this.config.items.map((item) => item.model),
            ],
        });
    }
}
