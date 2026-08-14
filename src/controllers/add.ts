import {ControllerHelper} from "../helpers/controllerHelper";
import {RequestProcessor} from "../lib/requestProcessor";
import {FieldsHelper} from "../helpers/fieldsHelper";
import {BaseFieldConfig, CreateUpdateConfig} from "../interfaces/adminpanelConfig";
import {
    detachMediaManagerField,
    isMediaManagerFieldConfig,
    saveRelationsMediaManager,
    updateCurrentHistoryMediaManagerData
} from "../lib/media-manager/helpers/MediaManagerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import inertiaAddHelper from "../helpers/inertiaAddHelper";

export default async function add(req: ReqType, res: ResType) {
    let modelResource = ControllerHelper.findModelResource(req);
    
    if (!modelResource.model) {
        return res.status(404).send({error: 'Model not Found'});
    }

    if (!modelResource.config?.add) {
        return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/${modelResource.uri}`);
    }

    let dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "add");
    let fields = dataAccessor.getFieldsConfig();

    // add deprecated 'records' to config
    fields = await FieldsHelper.loadAssociations(req, fields, "add");

    let data = {}; //list of field values

    if (req.method.toUpperCase() === 'POST') {
        let reqData: any = RequestProcessor.processRequest(req, fields);

        /**
         * Here means reqData adapt for model data, but rawReqData is processed for widget processing
         */
        const rawReqData = {...reqData};

        for (let prop in reqData) {

            if (Number.isNaN(reqData[prop]) || reqData[prop] === undefined || reqData[prop] === null) {
                delete reqData[prop]
            }

            if (reqData[prop] === "" && fields[prop].model.allowNull === true) {
                reqData[prop] = null
            }

            let fieldConfigConfig = fields[prop].config as BaseFieldConfig;

            if (fields[prop] && fields[prop].model && fields[prop].model.type === 'json' && reqData[prop] !== '') {
                try {
                    reqData[prop] = JSON.parse(reqData[prop]);
                } catch (e) {
                    if (typeof reqData[prop] === "string" && reqData[prop].replace(/(\r\n|\n|\r|\s{2,})/gm, "")) {
                        Adminizer.log.error(e);
                    }
                }
            }

            if (isMediaManagerFieldConfig(fieldConfigConfig)) {
                detachMediaManagerField(reqData, rawReqData, prop);
                continue;
            }

            // delete property from association-many and association if empty
            if (fields[prop] && fields[prop].model && (fields[prop].model.type === 'association-many' || fields[prop].model.type === 'association')) {
                if (!reqData[prop] || !reqData[prop].length) {
                    delete reqData[prop];
                } else {
                    if (fields[prop].model.type === 'association') {
                        reqData[prop] = (reqData[prop] as string[])[0]
                    }
                }
            }

            // split string for association-many
            if (fields[prop] && fields[prop].model && fields[prop].model.type === 'association-many' && reqData[prop] && typeof reqData[prop] === "string") {
                reqData[prop] = reqData[prop].split(",")
            }

            // HardFix: Long string was splitted as array of strings. https://github.com/balderdashy/sails/issues/7262
            if (fields[prop].model.type === 'string' && Array.isArray(reqData[prop])) {
                reqData[prop] = reqData[prop].join("");
            }
        }

        // callback before save modelResource
        let addConfig = modelResource.config.add as CreateUpdateConfig;
        if (typeof addConfig.entityModifier === "function") {
            reqData = addConfig.entityModifier(reqData);
        }

        try {
            let record = await modelResource.model.create(reqData, dataAccessor);
            const identifierField = modelResource.config.identifierField || req.adminizer.config.identifierField;
            const redirectId = (record as Record<string, any>)?.[identifierField] ?? (record as Record<string, any>)?.id;

            // save associations media to json
            await saveRelationsMediaManager(req.adminizer, fields, rawReqData, modelResource.model.identity, record.id)
            await updateCurrentHistoryMediaManagerData(req.adminizer, fields, rawReqData, modelResource.name, record.id)

            Adminizer.log.debug(`A new record was created: `, record);
            if (req.body.jsonPopupCatalog) {
                dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "edit");
                record = await modelResource.model.findOne({where: {id: record.id}}, dataAccessor);

                // await new Promise(resolve => setTimeout(resolve, 2000));
                return res.json({record: record})
            } else {
                req.flash.setFlashMessage('success', req.i18n.__('New record was created'));
                return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/${modelResource.name}/edit/${redirectId}`)
            }
        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
            data = reqData;
        }
    }
    const props = await inertiaAddHelper(req, modelResource, fields)

    if (req.query?.without_layout) {
        return res.json({
            props: props
        })
    } else {

        return req.Inertia.render({
            component: 'add',
            props: props
        })
    }
};


