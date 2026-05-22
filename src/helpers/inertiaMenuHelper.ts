import {Adminizer} from "../lib/Adminizer";
import { HrefConfig } from "../interfaces/adminpanelConfig";
import { MenuItem } from "./menuHelper";

export class InertiaMenuHelper {
    private adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer
    }

    public getMenuItems(req: ReqType) {
        const menu: MenuItem[] = []
        for (const menuItem of this.adminizer.menuHelper.getMenuItems(req.user)) {
            const menuItemTokens = menuItem.actions ? menuItem.actions.map(item => {
                return item.accessRightsToken
            }).filter(item => {
                return item
            }) : []
            if (menuItem.accessRightsToken) menuItemTokens.push(menuItem.accessRightsToken)
            if (this.adminizer.accessRightsHelper.enoughPermissions(menuItemTokens, req.user)) {
                menu.push(this.translateMenuItem(req, menuItem))
            }
        }
        return menu
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

    public getBrandTitle() {
        return this.adminizer.menuHelper.getBrandTitle()
    }

    public getLogoutUrl(){
        return `${this.adminizer.config.routePrefix}/model/userap/logout`
    }
}
