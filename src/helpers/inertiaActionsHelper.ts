import {ModelResource} from "../interfaces/types";
import {ActionType} from "../interfaces/adminpanelConfig";

export interface Actions {
    link: string;
    id: string;
    type: 'blank' | 'self';
    title: string;
    icon: string;
}

export default  function inertiaActionsHelper(actionType: ActionType, modelResource: ModelResource, req: ReqType) {
    let resActions: Actions[] = []
    if (req.adminizer.menuHelper.hasGlobalActions(modelResource.config, actionType)) {
        const actions = req.adminizer.menuHelper.getGlobalActions(modelResource.config, actionType)
        if (actions && actions.length > 0) {
            actions.forEach(function (action) {
                const context = `global action "${action.title}" (${action.id}) on model "${modelResource.name}"`;
                if (req.adminizer.accessRightsHelper.hasPermission(action.accessRightsToken, req.user, context)) {
                    resActions.push({
                        link: action.link,
                        id: action.id,
                        type: action.type,
                        title: action.title,
                        icon: action.icon
                    })
                }
            })
        }
    }
    return resActions
}


