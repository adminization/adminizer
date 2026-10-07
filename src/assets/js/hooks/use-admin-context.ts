import {useCallback, useMemo} from 'react';
import {router, usePage} from '@inertiajs/react';
import {findActiveLink, menuLinks, normalizeUrl} from '@/lib/active-link';
import {type AdminContextInfo, type NavItem, type NavSection, type SharedData} from '@/types';

const NO_ITEMS: NavItem[] = [];
const NO_CONTEXTS: AdminContextInfo[] = [];

/**
 * The layout context of the page for custom layouts and slot overrides: the
 * context, the ones the user may switch to, its menu and sections, whether a
 * link is the active one (the most specific match, as in the stock menu) and
 * a switch to another context.
 */
export function useAdminContext() {
    const page = usePage<SharedData>();
    const {adminContext: context, adminContexts: contexts = NO_CONTEXTS, menu: rawMenu, menuSections} = page.props;
    const menu = (rawMenu as NavItem[] | null | undefined) ?? NO_ITEMS;
    const activeLink = useMemo(() => findActiveLink(menuLinks(menu), page.url), [menu, page.url]);

    const isActive = useCallback(
        (link: string) => activeLink !== null && normalizeUrl(link) === activeLink,
        [activeLink],
    );
    const switchTo = useCallback((id: string) => {
        const target = contexts.find((item) => item.id === id);
        if (target) router.visit(target.link);
    }, [contexts]);

    return {context, contexts, menu, sections: (menuSections ?? {}) as Record<string, NavSection>, isActive, switchTo};
}
