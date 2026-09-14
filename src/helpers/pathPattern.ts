/**
 * Matches an Express-style pattern (`/model/:name`) against a concrete path.
 * Query, hash and trailing slashes are ignored on both sides.
 */
export function matchesPathPattern(pattern: string, url: string): boolean {
    const path = url.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
    const source = pattern.replace(/\/+$/, '') || '/';
    const regex = new RegExp(`^${
        source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z0-9_]+/g, '[^/]+')
    }$`);
    return regex.test(path);
}
