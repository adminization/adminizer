import {ControllerHelper} from "../helpers/controllerHelper";
import {Adminizer} from "../lib/Adminizer";
import {generate} from "password-hash";
import {inertiaUserHelper} from "../helpers/inertiaUserHelper";
import { UserAP } from "../models/UserAP";
import { GroupAP } from "../models/GroupAP";

export default async function (req: ReqType, res: ResType) {
    let entity = ControllerHelper.findEntityObject(req);

    // Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let user: UserAP;
    try {
        // TODO refactor CRUD functions for DataAccessor usage
        user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({id: req.params.id});
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        res.status(500).send({error: 'Internal Server Error'});
    }

    let groups: GroupAP[];
    try {
        // TODO refactor CRUD functions for DataAccessor usage
        groups = await req.adminizer.modelHandler.model.get("GroupAP")["_find"]({});
    } catch (e) {
        Adminizer.log.error(e)
    }

    let reloadNeeded = false;
    if (req.method.toUpperCase() === 'POST') {
        

        let userGroups = [];
        for (let key in req.body) {
            if (key.startsWith("group-checkbox-") && req.body[key] === true) {
                for (let group of groups) {
                    if (group.id == parseInt(key.slice(15))) {
                        userGroups.push(group.id)
                    }
                }
            }
        }

        let isAdministrator = req.body.isAdmin === true
        let isConfirmed = req.body.isConfirmed === true;

        let locale: string
        if (typeof req.adminizer.config.translation !== "boolean") {
            locale = req.body.locale === 'default' ? req.adminizer.config.translation.defaultLocale : req.body.locale;
        }

        let updatedUser: UserAP;
        try {
            // TODO refactor CRUD functions for DataAccessor usage
            updatedUser = await req.adminizer.modelHandler.model.get("UserAP")["_updateOne"]({id: user.id}, {
                login: req.body.login, fullName: req.body.fullName,
                email: req.body.email, timezone: req.body.timezone, expires: req.body.date,
                locale: locale, isAdministrator: isAdministrator, isConfirmed: isConfirmed, groups: userGroups
            });
            if (req.body.userPassword) {
                let passwordHashed = generate(req.body.login + req.body.userPassword + process.env.AP_PASSWORD_SALT);
                let password = 'masked';
                // TODO refactor CRUD functions for DataAccessor usage
                updatedUser = await req.adminizer.modelHandler.model.get("UserAP")["_updateOne"]({id: user.id}, {
                    login: req.body.login,
                    passwordHashed: passwordHashed
                });
            }
            Adminizer.log.debug(`User was updated: `, updatedUser);

            req.flash.setFlashMessage('success', 'User was updated !');
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/userap`)

        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
        }

        reloadNeeded = true;
    }

    if (reloadNeeded) {
        try {
            // TODO refactor CRUD functions for DataAccessor usage
            user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({id: req.params.id});
        } catch (e) {
            Adminizer.log.error('Admin edit error: ');
            Adminizer.log.error(e);
            return res.status(500).send({error: 'Internal Server Error'});
        }

        try {
            // TODO refactor CRUD functions for DataAccessor usage
            groups = await req.adminizer.modelHandler.model.get("GroupAP")["_find"]({});
        } catch (e) {
            Adminizer.log.error(e)
        }
    }

    const props = inertiaUserHelper(entity, req, groups, user)
    return req.Inertia.render({
        component: 'add-user',
        props: props
    })

};
