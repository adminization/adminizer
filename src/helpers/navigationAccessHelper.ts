import type {HrefConfig, MenuBadge} from '../interfaces/adminpanelConfig';
import {Adminizer} from '../lib/Adminizer';
import type {User} from '../models/User';
import type {MenuItem} from './menuHelper';

/** Drops the sub-items this user may not open, recursively. */
export async function filterAccessibleHrefItems(adminizer: Adminizer, user: User, items: HrefConfig[]): Promise<HrefConfig[]> {
    const accessible: HrefConfig[] = [];
    for (const item of items) {
        if (item.accessRightsToken && !await adminizer.accessRightsHelper.checkPermission(item.accessRightsToken, user)) {
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
 * The badge of a menu item for this user: a plain value as is, a resolver
 * called with the user. A failing resolver must not take the page down — it
 * is logged and the item renders without a badge.
 */
export async function resolveMenuBadge(user: User, badge: MenuBadge | undefined, itemId: string): Promise<number | string | undefined> {
    if (typeof badge !== 'function') return badge;
    try {
        return await badge(user);
    } catch (error) {
        Adminizer.log.error(`navigation > badge of "${itemId}" failed: ${error}`);
        return undefined;
    }
}

/**
 * The navigation menu a user may actually open: configured models, additional
 * links and app-contributed pages, filtered with the very same rules the
 * sidebar uses. Titles are left untranslated, so callers that need i18n (the
 * Inertia page props) translate on top of this. Badge resolvers are evaluated
 * here, after the permission check, so they never run for a hidden page.
 */
export async function listAccessibleMenuItems(adminizer: Adminizer, user: User): Promise<MenuItem[]> {
    const menu: MenuItem[] = [];

    for (const menuItem of adminizer.menuHelper.getMenuItems(user)) {
        const actions = await filterAccessibleHrefItems(adminizer, user, menuItem.actions ?? []);
        const tokens = actions.map((item) => item.accessRightsToken).filter(Boolean) as string[];
        if (menuItem.accessRightsToken) tokens.push(menuItem.accessRightsToken);
        if (await adminizer.accessRightsHelper.checkAnyPermission(tokens, user)) {
            menu.push({...menuItem, actions, badge: await resolveMenuBadge(user, menuItem.badge, menuItem.id)});
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
            badge: await resolveMenuBadge(user, link.badge, link.id),
        });
    }

    return menu;
}
