import { getUiTranslations } from "../lib/ui-i18n/getUiTranslations";
import { USER_FILTERS_UI_TRANSLATION_KEYS } from "../lib/ui-i18n/uiTranslationKeys";

/**
 * GET /adminizer/model/userfilters
 * Page controller for the user filters list view.
 */
export default async function listUserFilters(req: ReqType, res: ResType) {
    // Get all models for the dropdown
    const allModels = req.adminizer.config.models || {};
    const modelsList = Object.keys(allModels).map(name => {
        const config = allModels[name];
        return {
            name,
            title: config?.title || name
        };
    });

    return req.Inertia.render({
        component: 'user-filters-list',
        props: {
            title: req.i18n.__('User Filters'),
            models: modelsList,
            apiEndpoint: `${req.adminizer.config.routePrefix}/api/all-user-filters`,
            i18nPage: getUiTranslations(req, USER_FILTERS_UI_TRANSLATION_KEYS)
        }
    });
}
