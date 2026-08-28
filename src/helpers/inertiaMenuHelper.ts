import {Adminizer} from "../lib/Adminizer";
import { HrefConfig, NavbarSectionConfig } from "../interfaces/adminpanelConfig";
import { MenuItem } from "./menuHelper";
import { listAccessibleMenuItems } from "./navigationAccessHelper";

export class InertiaMenuHelper {
    private adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer
    }

    public async getMenuItems(req: ReqType): Promise<MenuItem[]> {
        return (await listAccessibleMenuItems(this.adminizer, req.user))
            .map((menuItem) => this.translateMenuItem(req, menuItem))
    }

    private translateMenuItem(req: ReqType, menuItem: MenuItem): MenuItem {
        return {
            ...menuItem,
            title: req.i18n.__(menuItem.title),
            section: menuItem.section ? req.i18n.__(menuItem.section) : menuItem.section,
            actions: menuItem.actions?.map((item) => this.translateHrefItem(req, item)) ?? null,
        };
    }

    private translateHrefItem(req: ReqType, item: HrefConfig): HrefConfig {
        return {
            ...item,
            title: req.i18n.__(item.title),
            section: item.section ? req.i18n.__(item.section) : item.section,
            subItems: item.subItems?.map((subItem) => this.translateHrefItem(req, subItem)),
        };
    }

    /**
     * Navbar section metadata keyed by the *translated* section name, so the UI
     * can look it up with the already-translated `section` of a menu item.
     */
    public getSections(req: ReqType): Record<string, NavbarSectionConfig> {
        const sections = this.adminizer.menuHelper.getSections();
        return Object.fromEntries(
            Object.entries(sections).map(([name, section]) => [req.i18n.__(name), section])
        );
    }

    public getBrandTitle() {
        return this.adminizer.menuHelper.getBrandTitle()
    }

    public getLogoutUrl(){
        return `${this.adminizer.config.routePrefix}/model/User/logout`
    }
}
