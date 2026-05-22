import { SwitchBase } from "./abstractSwitch";
import { InfoBase } from "./abstractInfo";
import { ActionBase } from "./abstractAction";
import { LinkBase } from "./abstractLink";
import { CustomBase } from "./abstractCustom";
import { AdminpanelIcon } from "../../interfaces/adminpanelConfig";
import { Adminizer } from "../Adminizer";
import { UserAP } from "../../models/UserAP";
import * as process from "node:process";
import { I18n } from "../I18n";
import { isAdminizerViteDevMode } from "../../helpers/runtimeMode";

export type WidgetType = (SwitchBase | InfoBase | ActionBase | LinkBase | CustomBase);

export interface WidgetConfig {
    id: string;
    type: string;
    api?: string;
    link?: string;
    description: string;
    icon: AdminpanelIcon;
    name: string;
    backgroundCSS: string;
    scriptUrl?: string;
    linkType?: 'self' | 'blank'
    constructorName?: string,
    constructorOption?: any,
    size?: { h: number; w: number; };
    added?: boolean;
    hideAdminPanelUI?: boolean
}

export interface WidgetLayoutItem {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    id: string;
}

export interface WidgetsLayouts {
    lg: WidgetLayoutItem[],
    md: WidgetLayoutItem[],
    sm: WidgetLayoutItem[],
    xs: WidgetLayoutItem[],
    xxs: WidgetLayoutItem[]
}

export class WidgetHandler {
    private widgets: WidgetType[] = [];
    public adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer;
    }

    public add(widget: WidgetType): void {
        this.adminizer.accessRightsHelper.registerToken({
            id: `widget-${widget.id}`,
            name: widget.name,
            description: widget.description,
            department: widget.department
        });
        this.widgets.push(widget);
    }

    public getById(id: string): WidgetType | undefined {
        if (this.widgets.length) {
            return this.widgets.find(widget => widget.id === id);
        } else {
            return undefined
        }
    }

    public removeById(id: string): void {
        if (this.widgets.length) {
            const index = this.widgets.findIndex(widget => widget.id === id);
            if (index !== -1) {
                this.widgets.splice(index, 1);
            }
        }
    }

    public getAll(user: UserAP, i18n: I18n): Promise<WidgetConfig[]> {
        let widgets: WidgetConfig[] = []
        if (this.widgets.length) {
            let id_key = 0
            for (const widget of this.widgets) {
                if (widget.widgetType === 'switcher') {
                    if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
                        widgets.push({
                            id: `${widget.id}__${id_key}`,
                            type: widget.widgetType,
                            api: `${this.adminizer.config.routePrefix}/widgets-switch/${widget.id}`,
                            description: i18n.__(widget.description),
                            icon: widget.icon as AdminpanelIcon,
                            name: i18n.__(widget.name),
                            backgroundCSS: widget.backgroundCSS ?? null,
                            size: widget.size ?? null
                        })
                    }
                } else if (widget.widgetType === 'info') {
                    if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
                        widgets.push({
                            id: `${widget.id}__${id_key}`,
                            type: widget.widgetType,
                            api: `${this.adminizer.config.routePrefix}/widgets-info/${widget.id}`,
                            description: i18n.__(widget.description),
                            icon: widget.icon as AdminpanelIcon,
                            name: i18n.__(widget.name),
                            backgroundCSS: widget.backgroundCSS ?? null,
                            size: widget.size ?? null,
                            link: widget.link,
                            linkType: widget.linkType
                        })
                    }
                } else if (widget.widgetType === 'action') {
                    if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
                        widgets.push({
                            id: `${widget.id}__${id_key}`,
                            type: widget.widgetType,
                            api: `${this.adminizer.config.routePrefix}/widgets-action/${widget.id}`,
                            description: i18n.__(widget.description),
                            icon: widget.icon as AdminpanelIcon,
                            name: i18n.__(widget.name),
                            backgroundCSS: widget.backgroundCSS ?? null,
                            size: widget.size ?? null
                        })
                    }
                } else if (widget.widgetType === 'link') {
                    if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
                        let links_id_key = 0
                        for (const link of widget.links) {
                            widgets.push({
                                name: i18n.__(link.name),
                                id: `${widget.id}__${links_id_key}`,
                                type: 'link',
                                linkType: link.linkType,
                                description: i18n.__(link.description),
                                link: link.link,
                                icon: link.icon,
                                backgroundCSS: link.backgroundCSS
                            })
                            links_id_key++;
                        }
                    }
                } else if (widget.widgetType === 'custom') {
                    if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
                        widgets.push({
                            id: `${widget.id}_${id_key}`,
                            type: widget.widgetType,
                            api: `${this.adminizer.config.routePrefix}/widgets-custom/${widget.id}`,
                            description: i18n.__(widget.description),
                            icon: widget.icon as AdminpanelIcon,
                            name: i18n.__(widget.name),
                            backgroundCSS: widget.backgroundCSS ?? null,
                            size: widget.size ?? null,
                            scriptUrl: isAdminizerViteDevMode() ? widget.jsPath.dev : widget.jsPath.production,
                        })
                    }
                } else {
                    return Promise.resolve([])
                }
            }
        }
        return Promise.resolve(widgets)
    }

    private translateWidgetConfig(widget: WidgetConfig, i18n: I18n): WidgetConfig {
        return {
            ...widget,
            name: typeof widget.name === "string" ? i18n.__(widget.name) : widget.name,
            description: typeof widget.description === "string" ? i18n.__(widget.description) : widget.description
        };
    }

    public async getWidgetsDB(id: number, auth: boolean, i18n: I18n): Promise<{
        widgets: WidgetConfig[],
        layout: WidgetsLayouts,
        defaultWidgets?: string[]
    }> {
        let user: UserAP;
        let result: { widgets: WidgetConfig[], layout: WidgetsLayouts, defaultWidgets?: string[] } = {
            widgets: [],
            layout: { lg: [], md: [], sm: [], xs: [], xxs: [] }
        };

        if (!auth) {
            // TODO refactor CRUD functions for DataAccessor usage
            user = await this.adminizer.modelHandler.model.get("UserAP")?.["_findOne"]({ login: this.adminizer.config.administrator?.login ?? 'admin' });
        } else {
            // TODO refactor CRUD functions for DataAccessor usage
            user = await this.adminizer.modelHandler.model.get("UserAP")?.["_findOne"]({ id: id });
        }

        if (!user || !user.widgets || user.widgets.widgets.length === 0) {
            // User has no saved widgets - return all widgets with default widget IDs
            result.widgets = await this.getAll(user, i18n);

            if (this.adminizer.config.dashboard && typeof this.adminizer.config.dashboard !== "boolean" && this.adminizer.config.dashboard.defaultWidgets) {
                result.defaultWidgets = this.adminizer.config.dashboard.defaultWidgets;
            }
        } else {
            // User has saved widgets - return them
            result.widgets = (user.widgets.widgets || []).map((widget: WidgetConfig) =>
                this.translateWidgetConfig(widget, i18n)
            );
            result.layout = user.widgets.layout;
        }

        return result;
    }


    public async setWidgetsDB(id: number, body: {
        widgets: WidgetConfig[],
        layout: WidgetLayoutItem[]
    }, auth: boolean): Promise<number> {
        if (!auth) {
            // TODO refactor CRUD functions for DataAccessor usage
            let updatedUser: UserAP = await this.adminizer.modelHandler.model.get("UserAP")?.["_updateOne"]({ login: this.adminizer.config.administrator?.login ?? 'admin' }, { widgets: body })
            return updatedUser.id
        } else {
            // TODO refactor CRUD functions for DataAccessor usage
            let updatedUser: UserAP = await this.adminizer.modelHandler.model.get("UserAP")?.["_updateOne"]({ id: id }, { widgets: body })
            return updatedUser.id
        }

    }
}
