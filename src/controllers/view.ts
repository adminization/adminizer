import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import {inertiaUserHelper} from "../helpers/inertiaUserHelper";
import {inertiaGroupHelper} from "../helpers/inertiaGroupHelper";
import {AccessRightsToken} from "../interfaces/types";
import inertiaAddHelper from "../helpers/inertiaAddHelper";
import {FieldsHelper} from "../helpers/fieldsHelper";
import { UserAP } from "models/UserAP";
import { GroupAP } from "models/GroupAP";

export default async function view(req: ReqType, res: ResType) {
    // Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let entity = ControllerHelper.findEntityObject(req);
    if (!entity.config.view) {
        return res.redirect(`${req.adminizer.config.routePrefix}/${entity.uri}`);
    }

    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    let dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "view");
    let fields = dataAccessor.getFieldsConfig();

    let record;
    try {
        record = await entity.model.findOne({id: req.params.id}, dataAccessor);
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        return res.status(500).send({error: 'Internal Server Error'});
    }

    switch (entity.config.model) {

        case 'userap':
            let groups: GroupAP[];
            try {
                // TODO refactor CRUD functions for DataAccessor usage
                groups = await req.adminizer.modelHandler.model.get("GroupAP")["_find"]({});
            } catch (e) {
                Adminizer.log.error(e)
            }
            const userProps = inertiaUserHelper(entity, req, groups, record as UserAP, true)
            return req.Inertia.render({
                component: 'view-user',
                props: userProps
            })

        case 'groupap':
            let users: UserAP[]
            try {
                // TODO refactor CRUD functions for DataAccessor usage
                users = await req.adminizer.modelHandler.model.get("UserAP")["_find"](({isAdministrator: false}));
            } catch (e) {
                Adminizer.log.error(e)
            }

            let group: GroupAP
            try {
                // TODO refactor CRUD functions for DataAccessor usage
                group = await req.adminizer.modelHandler.model.get("GroupAP")["_findOne"]({id: req.params.id});
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
            const groupProps = inertiaGroupHelper(entity, req, users, groupedTokens, group, true)
            return req.Inertia.render({
                component: 'view-group',
                props: groupProps
            })

        default:
            fields = await FieldsHelper.loadAssociations(req, fields, "edit");
            const props = inertiaAddHelper(req, entity, fields, record, true)
            return req.Inertia.render({
                component: 'view',
                props: props
            })
    }

};
