import {Entity} from "../interfaces/types";
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
    entity: {
        name: string;
        uri: string
    },
    inlineActions: Actions[],
    filtersEnabled?: boolean,
    activeFilterName?: string
}

export function inertiaListHelper(entity: Entity, req: ReqType, fields: Fields, activeFilterName?: string) {
    const actionType = 'list';

    // Check if filters are enabled for this model
    // Preferred: model-level `models.<Model>.filters`; fallback: legacy top-level `modelFilters.<Model>`
    const modelFiltersConfig = entity.config?.filters ?? req.adminizer.config.modelFilters?.[entity.name];
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
        entity: {
            name: entity.name,
            uri: entity.uri
        },
        delModal: {
            yes: req.i18n.__('Yes'),
            no: req.i18n.__('No'),
            text: req.i18n.__('Are you sure?')
        },
        notFoundContent: req.i18n.__('No records found !'),
        searchBtn: req.i18n.__('Search'),
        resetBtn: req.i18n.__('Reset'),
    } as listProps

    if (entity.config.add && req.adminizer.accessRightsHelper.hasPermission(`create-${entity.name}-model`, req.user, `CRUD create on model "${entity.name}"`)) {
        props.crudActions.createTitle = req.i18n.__('create')
    }
    if (entity.config.edit && req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.user, `CRUD update on model "${entity.name}"`)) {
        props.crudActions.editTitle = req.i18n.__('Edit')
    }
    if (entity.config.view && req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user, `CRUD read on model "${entity.name}"`)) {
        props.crudActions.viewsTitle = req.i18n.__('View')
    }
    if (entity.config.remove && req.adminizer.accessRightsHelper.hasPermission(`delete-${entity.name}-model`, req.user, `CRUD delete on model "${entity.name}"`)) {
        props.crudActions.deleteTitle = req.i18n.__('Delete')
    }

    props.actions = inertiaActionsHelper(actionType, entity, req)

    if (req.adminizer.menuHelper.hasInlineActions(entity.config, 'list')) {
        for (const inlineAction of req.adminizer.menuHelper.getInlineActions(entity.config, 'list')) {
            const context = `inline action "${inlineAction.title}" (${inlineAction.id}) on model "${entity.name}"`;
            if (req.adminizer.accessRightsHelper.hasPermission(inlineAction.accessRightsToken, req.user, context)) {
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
