export default function (req: ReqType, res: ResType) {
    if (req.adminizer.config.auth.enable && !req.user) {
        return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }

    return req.Inertia.render({
        component: 'dashboard',
        props: {
            title: req.i18n.__('Quick actions'),
            tooltip: req.i18n.__('Toggle to change the grid. To save the grid, turn it off.'),
            notWidgets: req.i18n.__('You don\'t have any widgets selected yet. You can add them by clicking on the plus sign at the top right.'),
            notFound: req.i18n.__('No widgets found'),
            actionsTitles: {
                "All": req.i18n.__('All'),
                'Custom': req.i18n.__('Custom'),
                'Fast links': req.i18n.__('Fast links'),
                'Actions': req.i18n.__('Actions'),
                'Info': req.i18n.__('Info'),
                'Switcher': req.i18n.__('Switcher'),
                'Filters': req.i18n.__('Filters')
            },
            searchPlaceholder: req.i18n.__('Search'),
        }
    });
};
