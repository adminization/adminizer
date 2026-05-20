import {ControllerHelper} from "../helpers/controllerHelper";
import {AccessRightsToken} from "../interfaces/types";
import {Adminizer} from "../lib/Adminizer";
import {inertiaGroupHelper} from "../helpers/inertiaGroupHelper";
import { UserAP } from "../models/UserAP";
import { GroupAP } from "../models/GroupAP";

export default async function editGroup(req: ReqType, res: ResType) {

    let modelResource = ControllerHelper.findModelResource(req);
    const internalUsers = req.adminizer.modelHandler.internal("users");
    const userModel = internalUsers.get<UserAP>("UserAP");
    const groupModel = internalUsers.get<GroupAP>("GroupAP");

    //Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let users: UserAP[]
    try {
        users = await userModel.find({where: {isAdministrator: false}});
    } catch (e) {
        Adminizer.log.error(e)
    }

    let group: GroupAP
    try {
        group = await groupModel.findOne({where: {id: req.params.id}});
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        res.status(500).send({error: 'Internal Server Error'});
    }

    let departments = req.adminizer.accessRightsHelper.getAllDepartments();

    let groupedTokens: {
        [key: string]: AccessRightsToken[]
    } = {}

    for (let department of departments) {
        groupedTokens[department] = req.adminizer.accessRightsHelper.getTokensByDepartment(department)
    }
    let reloadNeeded = false;
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

        let updatedGroup: GroupAP
        try {
            updatedGroup = await groupModel.updateOne({where: {id: group.id}}, {
                name: req.body.name, description: req.body.description,
                users: usersInThisGroup, tokens: tokensOfThisGroup
            });
            Adminizer.log.debug(`Group was updated: `, updatedGroup);

            req.flash.setFlashMessage('success', 'Group was updated !');
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/groupap`)

        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
        }

        reloadNeeded = true;
    }

    if (reloadNeeded) {
        try {
            group = await groupModel.findOne({where: {id: req.params.id}});
        } catch (e) {
            Adminizer.log.error('Admin edit error: ');
            Adminizer.log.error(e);
            return res.status(500).send({error: 'Internal Server Error'});
        }

        try {
            users = await userModel.find({where: {isAdministrator: false}});
        } catch (e) {
            Adminizer.log.error(e)
        }
    }

    

    const props = inertiaGroupHelper(modelResource, req, users, groupedTokens, group)
    return req.Inertia.render({
        component: 'add-group',
        props: props
    })
};


