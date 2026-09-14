/**
 * JSON proxy of the navigation registry (`AdminLinkHandler`): the very search
 * the assistant's `search-admin-links` skill performs, for the panel's global
 * search palette and for hosts. Policies checked the auth; the registry drops
 * every page this user may not open.
 */
export async function searchAdminLinks(req: ReqType, res: ResType) {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    return res.json({results: await req.adminizer.adminLinkHandler.search(req.user, query)});
}
