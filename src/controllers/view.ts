import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import {inertiaUserHelper} from "../helpers/inertiaUserHelper";
import {inertiaGroupHelper} from "../helpers/inertiaGroupHelper";
import {AccessRightsToken} from "../interfaces/types";
import inertiaAddHelper from "../helpers/inertiaAddHelper";
import {FieldsHelper} from "../helpers/fieldsHelper";
import {UserAP} from "../models/UserAP";
import {GroupAP} from "../models/GroupAP";
import {BaseFieldConfig, MediaManagerOptionsField} from "../interfaces/adminpanelConfig";
import {getRelationsMediaManager} from "../lib/media-manager/helpers/MediaManagerHelper";

export default async function view(req: ReqType, res: ResType) {
    // Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let modelResource = ControllerHelper.findModelResource(req);
    if (!modelResource.config.view) {
        return res.redirect(`${req.adminizer.config.routePrefix}/${modelResource.uri}`);
    }

    if (!modelResource.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    let dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "view");
    let fields = dataAccessor.getFieldsConfig();

    let record;
    try {
        record = await modelResource.model.findOne({where: {id: req.params.id}}, dataAccessor);
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        return res.status(500).send({error: 'Internal Server Error'});
    }

    switch (modelResource.config.model) {

        case 'userap':
            let groups: GroupAP[];
            try {
                groups = await req.adminizer.modelHandler.internal("users").get<GroupAP>("GroupAP").find({});
            } catch (e) {
                Adminizer.log.error(e)
            }
            const userProps = inertiaUserHelper(modelResource, req, groups, record as UserAP, true)
            return req.Inertia.render({
                component: 'add-user',
                props: userProps
            })

        case 'groupap':
            let users: UserAP[]
            try {
                users = await req.adminizer.modelHandler.internal("users").get<UserAP>("UserAP").find({where: {isAdministrator: false}});
            } catch (e) {
                Adminizer.log.error(e)
            }

            let group: GroupAP
            try {
                group = await req.adminizer.modelHandler.internal("users").get<GroupAP>("GroupAP").findOne({where: {id: req.params.id}});
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
            const groupProps = inertiaGroupHelper(modelResource, req, users, groupedTokens, group, true)
            return req.Inertia.render({
                component: 'add-group',
                props: groupProps
            })

        default:
            fields = await FieldsHelper.loadAssociations(req, fields, "edit");
            for (const field of Object.keys(fields)) {
                let fieldConfigConfig = fields[field].config as BaseFieldConfig;
                if (fieldConfigConfig.type === 'mediamanager') {
                    record[field] = await getRelationsMediaManager(req.adminizer, {
                        mediaManagerId: (fieldConfigConfig.options as MediaManagerOptionsField)?.id ?? "default",
                        model: modelResource.model.modelname,
                        widgetName: field,
                        modelId: req.params.id
                    })
                }
            }
            const props = inertiaAddHelper(req, modelResource, fields, record, true)
            return req.Inertia.render({
                component: 'add',
                props: props
            })
    }

};


