/** A link or URL without its query, hash and trailing slash. */
export function normalizeUrl(url: string): string {
    return url.split(/[?#]/)[0].replace(/\/+$/, '');
}

/**
 * The link of `links` that is active at `url`: the most specific one the URL
 * is at or below. A page below another item's link (a context home at the
 * context prefix, for one) must not light up that item as well.
 */
export function findActiveLink(links: (string | null | undefined)[], url: string): string | null {
    const current = normalizeUrl(url);
    let best: string | null = null;
    for (const link of links) {
        if (!link) continue;
        const normalized = normalizeUrl(link);
        if ((current === normalized || current.startsWith(`${normalized}/`)) && (best === null || normalized.length > best.length)) {
            best = normalized;
        }
    }
    return best;
}

/** The links of menu items and of their actions. */
export function menuLinks(items: { link: string; actions?: { link: string }[] | null }[]): string[] {
    return items.flatMap((item) => [item.link, ...(item.actions ?? []).map((action) => action.link)]);
}
