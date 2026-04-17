/**
 * Menu helper
 *
 * @constructor
 */
import { UserAP } from "../models/UserAP";
import { ActionType, AdminpanelConfig, HrefConfig, ModelConfig } from "../interfaces/adminpanelConfig";
import { GroupsAccessRightsHelper } from "./accessRightsHelper";

export type MenuItem = {
    link: string;
    title: string;
    id: string;
    type?: 'blank' | 'self';
    actions: HrefConfig[] | null;
    icon: string | null;
    accessRightsToken: string | null;
    entityName?: string;
    section?: string;
}

export class MenuHelper {

    private config: AdminpanelConfig;

    constructor(config: AdminpanelConfig) {
        this.config = config
    }

    /**
     * Get menu brand title
     *
     * @returns {string}
     */
    public getBrandTitle() {
        if (!this.config.brand || !this.config.brand.link) {
            return 'Adminizer';
        }
        if (typeof this.config.brand.link === "string") {
            return this.config.brand.link;
        }
        if (typeof this.config.brand.link === "object" && typeof this.config.brand.link.title === "string") {
            return this.config.brand.link.title;
        }
        return 'Adminizer';
    }

    /**
     * Check if global actions buttons added to action
     *
     * @param {Object} modelConfig
     * @param {string=} [action] Defaults to `list`
     * @returns {boolean}
     */
    public hasGlobalActions(modelConfig: ModelConfig, action: ActionType): boolean {
        action = action ?? 'list';

        const config = modelConfig[action];
        if (typeof config === "object" && config !== null && 'actions' in config) {
            if (!config.actions || !config.actions.global) {
                return false;
            }
            let actions = config.actions.global;
            return actions.length > 0;
        } else {
            return false;
        }

    }

    /**
     * Check if inline actions buttons added to action
     *
     * @param {Object} modelConfig
     * @param {string=} [action] Defaults to `list`
     * @returns {boolean}
     */
    public hasInlineActions(modelConfig: ModelConfig, action: ActionType): boolean {
        action = action ?? 'list';

        const config = modelConfig[action];

        if (typeof config !== "object" || config === null || !('actions' in config) || !config.actions?.inline) {
            return false;
        }

        const actions = config.actions.inline;
        return actions.length > 0;
    }

    /**
     * Get list of custom global buttons for action
     *
     * @param {Object} modelConfig
     * @param {string=} [action]
     * @returns {Array}
     */
    public getGlobalActions(modelConfig: ModelConfig, action: ActionType): HrefConfig[] {
        action = action ?? 'list';

        if (!this.hasGlobalActions(modelConfig, action)) {
            return [];
        }

        const config = modelConfig[action];

        if (typeof config === "object" && config !== null && 'actions' in config && config.actions?.global) {
            return config.actions.global;
        }

        return [];
    }

    /**
     * Get list of custom inline buttons for action
     *
     * @param {Object} modelConfig
     * @param {string=} [action]
     * @returns {Array}
     */
    public getInlineActions(modelConfig: ModelConfig, action: ActionType): HrefConfig[] {
        action = action || 'list';

        if (!this.hasInlineActions(modelConfig, action)) {
            return [];
        }

        const config = modelConfig[action];

        if (typeof config === "object" && config !== null && 'actions' in config && config.actions?.inline) {
            return config.actions.inline;
        }

        return [];
    }

    /**
     * Get list of entity menus that was not bound to groups
     *
     * @returns {Array}
     */
    public getMenuItems(user: UserAP): MenuItem[] {
        let menus: MenuItem[] = [];

        const staticLinks = this.config.navbar?.additionalLinks ?? [];
        staticLinks.forEach(function (additionalLink: HrefConfig & { disabled?: any }) {
            if (!additionalLink.link || !additionalLink.title || additionalLink.disabled) {
                return;
            }
            menus.push({
                link: additionalLink.link,
                title: additionalLink.title,
                type: additionalLink.type,
                id: additionalLink.id || additionalLink.title.replace(" ", "_"),
                actions: additionalLink.subItems || null,
                icon: additionalLink.icon || null,
                accessRightsToken: additionalLink.accessRightsToken || null,
                section: additionalLink.section || 'Platform',
            });
        });

        if (this.config.models) {
            const _this = this;
            Object.entries<ModelConfig>(this.config.models).forEach(function ([key, val]) {
                const hide =
                    typeof val.navbar?.visible === 'boolean'
                        ? !val.navbar.visible
                        : val.navbar?.groupsAccessRights
                        ? !GroupsAccessRightsHelper.hasAccess(user, val.navbar.groupsAccessRights)
                        : false;
                if (!hide) {
                    if (val.tools && val.tools.length > 0 && val.tools[0].id !== "overview") {
                        val.tools.unshift({
                            id: "overview",
                            link: _this.config.routePrefix + '/model/' + key,
                            title: 'Overview',
                            type: 'self',
                            icon: "list",
                            accessRightsToken: `read-${key}-model`
                        })
                    }
                    menus.push({
                        link: _this.config.routePrefix + '/model/' + key,
                        title: val.title || key,
                        icon: val.icon || null,
                        actions: val.tools || null,
                        id: val.title ? val.title.replace(" ", "_") : key,
                        entityName: key,
                        accessRightsToken: `read-${key}-model`,
                        section: val.navbar?.section || 'Platform',
                    });
                }
            });
        }

        const { handleAdditionalLinks, sectionHandlers } = this.config.navbar ?? {};

        if (handleAdditionalLinks) {
            menus = handleAdditionalLinks(user, menus as unknown as HrefConfig[]) as unknown as MenuItem[];
        }

        if (sectionHandlers) {
            const sections = Object.keys(sectionHandlers);
            sections.forEach(section => {
                const handler = sectionHandlers[section];
                const sectionLinks = menus.filter(m => m.section === section);
                const otherLinks = menus.filter(m => m.section !== section);
                const handled = handler(user, sectionLinks as unknown as HrefConfig[]) as unknown as MenuItem[];
                menus = [...otherLinks, ...handled];
            });
        }

        return menus;
    }
}
