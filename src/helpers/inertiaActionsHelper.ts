import {ModelResource} from "../interfaces/types";
import {ActionType} from "../interfaces/adminpanelConfig";

export interface Actions {
    link: string;
    id: string;
    type: 'blank' | 'self';
    title: string;
    icon: string;
}

export default async function inertiaActionsHelper(actionType: ActionType, modelResource: ModelResource, req: ReqType) {
    let resActions: Actions[] = []
    if (req.adminizer.menuHelper.hasGlobalActions(modelResource.config, actionType)) {
        const actions = req.adminizer.menuHelper.getGlobalActions(modelResource.config, actionType)
        if (actions && actions.length > 0) {
            for (const action of actions) {
                if (await req.adminizer.accessRightsHelper.checkPermission(action.accessRightsToken, req.user)) {
                    resActions.push({
                        link: action.link,
                        id: action.id,
                        type: action.type,
                        title: action.title,
                        icon: action.icon
                    })
                }
            }
        }
    }
    return resActions
}


