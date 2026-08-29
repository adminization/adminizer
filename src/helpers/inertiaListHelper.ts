import {ModelResource} from "../interfaces/types";
import {Fields} from "./fieldsHelper";
import inertiaActionsHelper, {Actions} from "./inertiaActionsHelper";

interface listProps extends Record<string | number | symbol, unknown> {
    actions: Actions[],
    thActionsTitle: string,
    crudActions: {
        createTitle: string;
        editTitle: string;
        viewsTitle: string;
        deleteTitle: string
    },
    delModal: {
        yes: string,
        no: string
        text: string
    },
    notFoundContent: string,
    searchBtn: string,
    resetBtn: string,
    modelResource: {
        name: string;
        uri: string
    },
    inlineActions: Actions[],
    filtersEnabled?: boolean,
    activeFilterName?: string
    defaultPageSize: number
    pageSizeOptions: number[]
}

export async function inertiaListHelper(modelResource: ModelResource, req: ReqType, fields: Fields, activeFilterName?: string) {
    const actionType = 'list';

    // Check if filters are enabled for this model
    // Preferred: model-level `models.<Model>.filters`; fallback: legacy top-level `modelFilters.<Model>`
    const modelFiltersConfig = modelResource.config?.filters ?? req.adminizer.config.modelFilters?.[modelResource.name];
    const filtersEnabledGlobally = req.adminizer.config.filters?.enabled !== false;
    const filtersEnabled = filtersEnabledGlobally && modelFiltersConfig?.enabled === true;
    
    let props = {
        thActionsTitle: req.i18n.__('Actions'),
        actions: [],
        inlineActions: [],
        crudActions: {
            createTitle: '',
            editTitle: '',
            viewsTitle: '',
            deleteTitle: ''
        },
        modelResource: {
            name: modelResource.name,
            uri: modelResource.uri
        },
        delModal: {
            yes: req.i18n.__('Yes'),
            no: req.i18n.__('No'),
            text: req.i18n.__('Are you sure?')
        },
        notFoundContent: req.i18n.__('No records found !'),
        searchBtn: req.i18n.__('Search'),
        resetBtn: req.i18n.__('Reset'),
        defaultPageSize: req.adminizer.config.list?.defaultPageSize ?? 50,
        pageSizeOptions: [5, 20, 50],
    } as listProps

    if (modelResource.config.add && await req.adminizer.accessRightsHelper.checkPermission(`create-${modelResource.name}-model`, req.user)) {
        props.crudActions.createTitle = req.i18n.__('create')
    }
    if (modelResource.config.edit && await req.adminizer.accessRightsHelper.checkPermission(`update-${modelResource.name}-model`, req.user)) {
        props.crudActions.editTitle = req.i18n.__('Edit')
    }
    if (modelResource.config.view && await req.adminizer.accessRightsHelper.checkPermission(`read-${modelResource.name}-model`, req.user)) {
        props.crudActions.viewsTitle = req.i18n.__('View')
    }
    if (modelResource.config.remove && await req.adminizer.accessRightsHelper.checkPermission(`delete-${modelResource.name}-model`, req.user)) {
        props.crudActions.deleteTitle = req.i18n.__('Delete')
    }

    props.actions = await inertiaActionsHelper(actionType, modelResource, req)

    if (req.adminizer.menuHelper.hasInlineActions(modelResource.config, 'list')) {
        for (const inlineAction of req.adminizer.menuHelper.getInlineActions(modelResource.config, 'list')) {
            if (await req.adminizer.accessRightsHelper.checkPermission(inlineAction.accessRightsToken, req.user)) {
                props.inlineActions.push({
                    icon: inlineAction.icon,
                    id: inlineAction.id,
                    type: inlineAction.type,
                    link: inlineAction.link,
                    title: req.i18n.__(inlineAction.title),
                })
            }
        }
    }

    // Add filtersEnabled flag
    props.filtersEnabled = filtersEnabled;

    // Add active filter name if filter is applied
    if (activeFilterName) {
        props.activeFilterName = activeFilterName;
    }

    return props
}


