import type {HrefConfig} from '../interfaces/adminpanelConfig';
import type {Adminizer} from '../lib/Adminizer';
import type {User} from '../models/User';
import type {MenuItem} from './menuHelper';

/** Drops the sub-items this user may not open, recursively. */
export async function filterAccessibleHrefItems(adminizer: Adminizer, user: User, items: HrefConfig[]): Promise<HrefConfig[]> {
    const accessible: HrefConfig[] = [];
    for (const item of items) {
        if (item.accessRightsToken && !await adminizer.accessRightsHelper.hasPermission(item.accessRightsToken, user)) {
            continue;
        }
        accessible.push({
            ...item,
            subItems: item.subItems ? await filterAccessibleHrefItems(adminizer, user, item.subItems) : item.subItems,
        });
    }
    return accessible;
}

/**
 * The navigation menu a user may actually open: configured models, additional
 * links and app-contributed pages, filtered with the very same rules the
 * sidebar uses. Titles are left untranslated, so callers that need i18n (the
 * Inertia page props) translate on top of this.
 */
export async function listAccessibleMenuItems(adminizer: Adminizer, user: User): Promise<MenuItem[]> {
    const menu: MenuItem[] = [];

    for (const menuItem of adminizer.menuHelper.getMenuItems(user)) {
        const actions = await filterAccessibleHrefItems(adminizer, user, menuItem.actions ?? []);
        const tokens = actions.map((item) => item.accessRightsToken).filter(Boolean) as string[];
        if (menuItem.accessRightsToken) tokens.push(menuItem.accessRightsToken);
        if (await adminizer.accessRightsHelper.enoughPermissions(tokens, user)) {
            menu.push({...menuItem, actions});
        }
    }

    for (const link of await adminizer.adminLinkHandler.list(user)) {
        menu.push({
            id: link.id,
            link: link.link,
            title: link.title,
            type: link.type === 'blank' ? 'blank' : 'self',
            actions: null,
            icon: null,
            accessRightsToken: link.accessRightsToken ?? null,
            section: link.section || 'Platform',
        });
    }

    return menu;
}
