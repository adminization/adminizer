import {ControllerHelper} from "../helpers/controllerHelper";
import {AccessRightsToken} from "../interfaces/types";
import {Adminizer} from "../lib/Adminizer";
import {inertiaGroupHelper} from "../helpers/inertiaGroupHelper";
import { UserAP } from "../models/UserAP";
import { GroupAP } from "../models/GroupAP";

export default async function addGroup(req: ReqType, res: ResType) {

    let entity = ControllerHelper.findEntityObject(req);

    let users: UserAP[];
    try {
        // TODO refactor CRUD functions for DataAccessor usage
        users = await req.adminizer.modelHandler.model.get("UserAP")["_find"]({isAdministrator: false});
    } catch (e) {
        Adminizer.log.error(e)
    }

    let departments = req.adminizer.accessRightsHelper.getAllDepartments();

    let groupedTokens: {
        [key: string]: AccessRightsToken[]
    } = {}

    for (let department of departments) {
        groupedTokens[department] = req.adminizer.accessRightsHelper.getTokensByDepartment(department)
    }

    if (req.method.toUpperCase() === 'POST') {
        let allTokens = req.adminizer.accessRightsHelper.getTokens();

        let usersInThisGroup = [];
        let tokensOfThisGroup = [];
        for (let key in req.body) {
            if (key.startsWith("user-checkbox-") && req.body[key] === true) {
                for (let user of users) {
                    if (user.id == parseInt(key.slice(14))) {
                        usersInThisGroup.push(user.id)
                    }
                }
            }

            if (key.startsWith("token-checkbox-") && req.body[key] === true) {
                for (let token of allTokens) {
                    if (token.id == key.slice(15)) {
                        tokensOfThisGroup.push(token.id)
                    }
                }
            }
        }

        let group: GroupAP;
        try {
            // TODO refactor CRUD functions for DataAccessor usage
            group = await req.adminizer.modelHandler.model.get("GroupAP")?.["_create"]({
                name: req.body.name, description: req.body.description,
                users: usersInThisGroup, tokens: tokensOfThisGroup
            })

            Adminizer.log.debug(`A new group was created: `, group);

            req.flash.setFlashMessage('success', 'A new group was created !');
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/groupap`)
        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
        }
    }

    const props = inertiaGroupHelper(entity, req, users, groupedTokens)
    return req.Inertia.render({
        component: 'add-group',
        props: props as unknown as Record<string | number | symbol, unknown>
    })
};
