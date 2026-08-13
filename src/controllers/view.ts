import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import {inertiaUserHelper} from "../helpers/inertiaUserHelper";
import {inertiaGroupHelper} from "../helpers/inertiaGroupHelper";
import {AccessRightsToken} from "../interfaces/types";
import inertiaAddHelper from "../helpers/inertiaAddHelper";
import {FieldsHelper} from "../helpers/fieldsHelper";
import {User} from "../models/User";
import {Group} from "../models/Group";
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

    switch (modelResource.name) {

        case 'User':
            let groups: Group[];
            try {
                groups = await req.adminizer.modelHandler.internal("users").get<Group>("Group").find({});
            } catch (e) {
                Adminizer.log.error(e)
            }
            const userProps = inertiaUserHelper(modelResource, req, groups, record as User, true)
            return req.Inertia.render({
                component: 'add-user',
                props: userProps
            })

        case 'Group':
            let users: User[]
            try {
                users = await req.adminizer.modelHandler.internal("users").get<User>("User").find({where: {isAdministrator: false}});
            } catch (e) {
                Adminizer.log.error(e)
            }

            let group: Group
            try {
                group = await req.adminizer.modelHandler.internal("users").get<Group>("Group").findOne({where: {id: Number(req.params.id)}});
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


