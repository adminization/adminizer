import {ControllerHelper} from "../helpers/controllerHelper";
import {Adminizer} from "../lib/Adminizer";
import {generate} from 'password-hash';
import {inertiaUserHelper} from "../helpers/inertiaUserHelper";
import { UserAP } from "../models/UserAP";
import { GroupAP } from "../models/GroupAP";
import { generateUserApiKey } from "../helpers/apiKeyHelper";

export default async function (req: ReqType, res: ResType) {
    let entity = ControllerHelper.findEntityObject(req);
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`create-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    let groups: GroupAP[];
    try {
        // TODO refactor CRUD functions for DataAccessor usage
        groups = await req.adminizer.modelHandler.model.get("GroupAP")["_find"]({});
    } catch (e) {
        Adminizer.log.error(e)
    }

    let user: UserAP;

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

        let isAdministrator = req.body.isAdmin === true;
        let isConfirmed = req.body.isConfirmed === true;

        let locale: string
        if (typeof req.adminizer.config.translation !== "boolean") {
            locale = req.body.locale === 'default' ? req.adminizer.config.translation.defaultLocale : req.body.locale;
        }

        try {
            let passwordHashed = generate(req.body.login + req.body.userPassword + process.env.AP_PASSWORD_SALT);
            let password = 'masked';
            // TODO refactor CRUD functions for DataAccessor usage
            user = await req.adminizer.modelHandler.model.get("UserAP")["_create"]({
                login: req.body.login, fullName: req.body.fullName, email: req.body.email,
                passwordHashed: passwordHashed, timezone: req.body.timezone, expires: req.body.date,
                locale: locale, isAdministrator: isAdministrator, isConfirmed: isConfirmed, groups: userGroups,
                apiKey: generateUserApiKey()
            })
            Adminizer.log.debug(`A new user was created: `, user);

            req.flash.setFlashMessage('success', 'A new user was created !');
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/userap`)

        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
        }
    }
    const props = inertiaUserHelper(entity, req, groups)
    return req.Inertia.render({
        component: 'add-user',
        props: props
    })
};
