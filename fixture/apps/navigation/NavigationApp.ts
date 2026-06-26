import path from "path";
import {AbstractAdminizerApp, AppSetupContext} from "../../../dist";
import {NavigationCatalog} from "./NavigationCatalog";
import {navigationModelName} from "./NavigationModel";
import type {NavigationAppConfig} from "./NavigationTypes";

const NAVIGATION_ACCESS_TOKEN = "catalog-navigation";

export class NavigationApp extends AbstractAdminizerApp<NavigationAppConfig> {
    readonly name = "navigation";
    readonly version = "1.0.0";
    declare readonly config: NavigationAppConfig;

    constructor(config: NavigationAppConfig) {
        super();
        this.config = {
            ...config,
            model: config.model ?? navigationModelName,
            routePrefix: config.routePrefix ?? "",
            componentFile: config.componentFile ?? path.resolve(import.meta.dirname, "NavigationCatalogTemplates.es.js"),
            devComponentUrl: config.devComponentUrl ?? "/fixture/apps/navigation/NavigationCatalogTemplates.tsx",
        };
    }

    setup(ctx: AppSetupContext): void {
        let navigationCatalog: NavigationCatalog | undefined;

        ctx.accessRight({
            id: NAVIGATION_ACCESS_TOKEN,
            name: "Navigation",
            description: "Access to edit navigation catalogs",
            department: "Catalog",
        });

        const catalogTemplates = ctx.asset({
            id: "catalog-templates",
            filePath: this.config.componentFile,
            devUrl: this.config.devComponentUrl,
        });

        ctx.model({
            name: this.config.model,
        });

        ctx.modelAccess({
            models: [
                this.config.model,
                ...this.config.items.map((item) => item.model),
            ],
        });

        ctx.config({
            models: {
                [this.config.model.toLowerCase()]: {
                    add: false,
                    fields: {
                        createdAt: {visible: false},
                        updatedAt: {visible: false},
                    },
                    navbar: {
                        visible: true,
                    },
                    icon: "storage",
                    identifierField: "",
                    list: {
                        fields: {
                            tree: {visible: false},
                            id: {visible: false},
                        },
                    },
                    model: this.config.model.toLowerCase(),
                    remove: false,
                    title: this.config.model,
                    tools: [],
                },
            },
            navbar: {
                additionalLinks: this.config.sections.map((section) => ({
                    id: `navigation-${section}`,
                    type: "self",
                    link: `${this.config.routePrefix}/catalog/navigation/${section}`,
                    title: `Nav ${section.charAt(0).toUpperCase()}${section.slice(1)}`,
                    icon: "menu" as any,
                    accessRightsToken: NAVIGATION_ACCESS_TOKEN,
                })),
            },
        });

        ctx.catalog({
            id: "navigation",
            templates: [
                {
                    id: "model-link-template",
                    type: "navigation.model-link",
                    component: catalogTemplates,
                    exportName: "NavigationModelLinkTemplate",
                },
                {
                    id: "group-template",
                    type: "navigation.group",
                    component: catalogTemplates,
                    exportName: "NavigationGroupTemplate",
                },
                {
                    id: "link-template",
                    type: "navigation.link",
                    component: catalogTemplates,
                    exportName: "NavigationLinkTemplate",
                },
            ],
            factory: async (runtime) => {
                const catalog = new NavigationCatalog(runtime, this.config);
                await catalog.ready();
                navigationCatalog = catalog;
                return catalog;
            },
        });

        ctx.listener("model:updated", async (event: {
            modelName: string;
            record: Record<string, any>;
        }) => {
            if (!navigationCatalog) {
                return;
            }

            const itemConfig = this.config.items.find((item) =>
                item.model.toLowerCase() === event.modelName.toLowerCase()
            );
            if (!itemConfig) {
                return;
            }

            for (const section of this.config.sections) {
                navigationCatalog.setId(section);
                const navItem = navigationCatalog.itemTypes.find((item) =>
                    item.type === event.modelName.toLowerCase()
                );
                if (navItem) {
                    await navItem.updateModelItems(event.record.id, {record: event.record}, section);
                }
            }
        });
    }
}
