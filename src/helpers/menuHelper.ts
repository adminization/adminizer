/**
 * Menu helper
 *
 * @constructor
 */
import { User } from "../models/User";
import { ActionType, AdminpanelConfig, HrefConfig, ModelConfig, NavbarSectionConfig } from "../interfaces/adminpanelConfig";
import { GroupsAccessRightsHelper } from "./accessRightsHelper";

export type MenuItem = {
    link: string;
    title: string;
    id: string;
    type?: 'blank' | 'self';
    actions: HrefConfig[] | null;
    icon: string | null;
    accessRightsToken: string | null;
    modelResourceName?: string;
    section?: string;
}

export class MenuHelper {

    private config: AdminpanelConfig;

    constructor(config: AdminpanelConfig) {
        this.config = config
    }

    private normalizePath(path: string): string {
        return path.replace(/[?#].*$/, "").replace(/\/+$/, "");
    }

    private inferCatalogAccessToken(link?: string): string | undefined {
        if (!link || typeof link !== "string") {
            return undefined;
        }

        // Skip external links.
        if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//")) {
            return undefined;
        }

        const routePrefix = (this.config.routePrefix || "").replace(/\/+$/, "");
        let normalized = this.normalizePath(link);

        if (routePrefix && normalized.startsWith(`${routePrefix}/`)) {
            normalized = normalized.slice(routePrefix.length);
        } else if (routePrefix && normalized === routePrefix) {
            normalized = "";
        }

        if (!normalized.startsWith("/")) {
            normalized = `/${normalized}`;
        }

        const match = normalized.match(/^\/catalog\/([^/]+)/i);
        if (!match?.[1]) {
            return undefined;
        }

        try {
            return `catalog-${decodeURIComponent(match[1]).toLowerCase()}`;
        } catch {
            return `catalog-${match[1].toLowerCase()}`;
        }
    }

    private enrichHrefAccessToken(item: HrefConfig): HrefConfig {
        const subItems = item.subItems?.map((subItem) => this.enrichHrefAccessToken(subItem));
        const accessRightsToken = item.accessRightsToken || this.inferCatalogAccessToken(item.link);

        return {
            ...item,
            accessRightsToken,
            subItems
        };
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
     * Presentation metadata of navbar sections, keyed by section name.
     *
     * Only sections declared under `navbar.sections` are present: a section
     * used by links but never configured simply has no entry, and the UI falls
     * back to its default rendering.
     *
     * @returns {Record<string, NavbarSectionConfig>}
     */
    public getSections(): Record<string, NavbarSectionConfig> {
        return { ...(this.config.navbar?.sections ?? {}) };
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
     * Get list of ModelResource menus that was not bound to groups
     *
     * @returns {Array}
     */
    public getMenuItems(user: User): MenuItem[] {
        let menus: MenuItem[] = [];

        const filtersDisabledGlobally = this.config.filters?.enabled === false;
        const staticLinks = this.config.navbar?.additionalLinks ?? [];
        staticLinks.forEach((additionalLink: HrefConfig & { disabled?: any }) => {
                const additionalLinkPath = typeof additionalLink.link === "string"
                    ? additionalLink.link.replace(/\/+$/, "")
                    : "";
                const isUserFiltersLink = additionalLink.id === "user-filters"
                    || additionalLinkPath.endsWith("/user-filters");
                if (filtersDisabledGlobally && isUserFiltersLink) {
                    return;
                }
            if (!additionalLink.link || !additionalLink.title || additionalLink.disabled) {
                return;
            }
            const resolvedLink = this.enrichHrefAccessToken(additionalLink);
            menus.push({
                link: resolvedLink.link,
                title: resolvedLink.title,
                type: resolvedLink.type,
                id: resolvedLink.id || resolvedLink.title.replace(" ", "_"),
                actions: resolvedLink.subItems || null,
                icon: resolvedLink.icon || null,
                accessRightsToken: resolvedLink.accessRightsToken || null,
                section: resolvedLink.section || 'Platform',
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
                        actions: val.tools ? val.tools.map((tool) => _this.enrichHrefAccessToken(tool)) : null,
                        id: val.title ? val.title.replace(" ", "_") : key,
                        modelResourceName: key,
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

