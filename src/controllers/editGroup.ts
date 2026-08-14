import {ControllerHelper} from "../helpers/controllerHelper";
import {AccessRightsToken, PermissionGrant} from "../interfaces/types";
import {Adminizer} from "../lib/Adminizer";
import {inertiaGroupHelper} from "../helpers/inertiaGroupHelper";
import { User } from "../models/User";
import { Group } from "../models/Group";

export default async function editGroup(req: ReqType, res: ResType) {

    let modelResource = ControllerHelper.findModelResource(req);
    const internalUsers = req.adminizer.modelHandler.internal("users");
    const userModel = internalUsers.get<User>("User");
    const groupModel = internalUsers.get<Group>("Group");

    //Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let users: User[]
    try {
        users = await userModel.find({where: {isAdministrator: false}});
    } catch (e) {
        Adminizer.log.error(e)
    }

    let group: Group
    try {
        group = await groupModel.findOne({where: {id: Number(req.params.id)}});
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
        let tokensOfThisGroup: PermissionGrant[] = [];
        for (let key in req.body) {
            if (key.startsWith("user-checkbox-") && req.body[key] === true) {
                for (let user of users) {
                    if (user.id == parseInt(key.slice(14))) {
                        usersInThisGroup.push(user.id)
                    }
                }
            }

        }

        for (const token of allTokens) {
            if (req.body[`token-checkbox-${token.id}`] !== true) continue;

            if (!token.getOptions) {
                tokensOfThisGroup.push(token.id);
                continue;
            }

            const submittedRights = req.body[`token-record-rights-${token.id}`];
            const rights = Array.isArray(submittedRights)
                ? Array.from(new Set(submittedRights.map(String)))
                : [];
            tokensOfThisGroup.push({
                tokenId: token.id,
                rights,
            });
        }

        let updatedGroup: Group
        try {
            updatedGroup = await groupModel.updateOne({where: {id: group.id}}, {
                name: req.body.name, description: req.body.description,
                users: usersInThisGroup, tokens: tokensOfThisGroup
            });
            Adminizer.log.debug(`Group was updated: `, updatedGroup);

            req.flash.setFlashMessage('success', 'Group was updated !');
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/Group`)

        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
        }

        reloadNeeded = true;
    }

    if (reloadNeeded) {
        try {
            group = await groupModel.findOne({where: {id: Number(req.params.id)}});
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


