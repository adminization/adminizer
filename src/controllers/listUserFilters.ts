/**
 * GET /adminizer/model/userfilters
 * Page controller for the user filters list view.
 */
export default async function listUserFilters(req: ReqType, res: ResType) {
    if (req.adminizer.config.auth.enable && !req.user) {
        return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }

    // Get all models for the dropdown
    const allModels = req.adminizer.config.models || {};
    const modelsList = Object.keys(allModels).map(name => {
        const config = allModels[name];
        return {
            name,
            title: config?.title || name
        };
    });

    // Collect translations for UI
    const translations = {
        'Loading...': req.i18n.__('Loading...'),
        'Search filters...': req.i18n.__('Search filters...'),
        'All models': req.i18n.__('All models'),
        'No filters found': req.i18n.__('No filters found'),
        'Loading more...': req.i18n.__('Loading more...'),
        'Filter Name': req.i18n.__('Filter Name'),
        'Model': req.i18n.__('Model'),
        'Visibility': req.i18n.__('Visibility'),
        'API access (feed)': req.i18n.__('API access (feed)'),
        'Owner': req.i18n.__('Owner'),
        'Private': req.i18n.__('Private'),
        'Public': req.i18n.__('Public'),
        'Groups': req.i18n.__('Groups'),
        'Yes': req.i18n.__('Yes'),
        'No': req.i18n.__('No'),
        'You': req.i18n.__('You'),
        'Unknown': req.i18n.__('Unknown'),
        'Reset': req.i18n.__('Reset'),
        'found': req.i18n.__('found'),
    };

    return req.Inertia.render({
        component: 'user-filters-list',
        props: {
            title: req.i18n.__('User Filters'),
            models: modelsList,
            apiEndpoint: `${req.adminizer.config.routePrefix}/api/all-user-filters`,
            translations
        }
    });
}
