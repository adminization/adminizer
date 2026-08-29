import {ControllerHelper} from "../helpers/controllerHelper";
import {RequestProcessor} from "../lib/requestProcessor";
import {FieldsHelper} from "../helpers/fieldsHelper";
import {BaseFieldConfig, CreateUpdateConfig, MediaManagerOptionsField} from "../interfaces/adminpanelConfig";

import {
    detachMediaManagerField,
    getRelationsMediaManager,
    isMediaManagerFieldConfig,
    saveRelationsMediaManager,
    updateCurrentHistoryMediaManagerData
} from "../lib/media-manager/helpers/MediaManagerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import inertiaAddHelper from "../helpers/inertiaAddHelper";

export default async function edit(req: ReqType, res: ResType) {
    //Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let modelResource = ControllerHelper.findModelResource(req);
    
    if (!modelResource.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (!modelResource.config.edit) {
        return res.redirect(`${req.adminizer.config.routePrefix}/${modelResource.uri}`);
    }

    let record;
    let dataAccessor;
    const id = req.params.id
    try {
        dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "edit");
        record = await modelResource.model.findOne({where: {id: id}}, dataAccessor);
        if (!record) return res.status(404).send("Adminpanel > Record not found");
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        return res.status(500).send({error: 'Internal Server Error'});
    }

    let fields = dataAccessor.getFieldsConfig();

    // add deprecated 'records' to config
    fields = await FieldsHelper.loadAssociations(req, fields, "edit", dataAccessor.recordAccessCache);

    // Save
    if (req.method.toUpperCase() === 'POST') {
        const identifierField = modelResource.config.identifierField || req.adminizer.config.identifierField;
        delete req.body.redirectUrl

        let reqData = RequestProcessor.processRequest(req, fields);
        let params: {
            [key: string]: number | string
        } = {};
        params[modelResource.config.identifierField || req.adminizer.config.identifierField] = req.params.id;

        /**
         * Here means reqData adapt for model data, but rawReqData is processed for widget processing
         */
        const rawReqData = {...reqData};

        for (let prop in reqData) {
            if (fields[prop].model.type === 'boolean') {
                reqData[prop] = Boolean(reqData[prop]);
            }

            if (Number.isNaN(reqData[prop]) || reqData[prop] === undefined || reqData[prop] === null) {
                delete reqData[prop]
            }

            if (reqData[prop] === "" && fields[prop].model.allowNull === true) {
                reqData[prop] = null
            }

            let fieldConfigConfig = fields[prop].config as BaseFieldConfig;


            // Normalize empty association payloads before passing them to the adapter
            if (fields[prop] && fields[prop].model && (fields[prop].model.type === 'association-many' || fields[prop].model.type === 'association')) {
                if (!reqData[prop] || !(reqData[prop] as string[]).length) {
                    reqData[prop] = fields[prop].model.type === 'association' ? null : [];
                } else {
                    if (fields[prop].model.type === 'association') {
                        reqData[prop] = (reqData[prop] as string[])[0]
                    }
                }
            }

            if (isMediaManagerFieldConfig(fieldConfigConfig)) {
                detachMediaManagerField(reqData, rawReqData, prop);
                continue;
            }

            if (fields[prop] && fields[prop].model && fields[prop].model.type === 'json' && reqData[prop] !== '') {
                if (typeof reqData[prop] === "string") {
                    try {
                        reqData[prop] = JSON.parse(reqData[prop] as string);
                    } catch (e) {
                        if (typeof reqData[prop] === "string" && reqData[prop].toString().replace(/(\r\n|\n|\r|\s{2,})/gm, "")) {
                            Adminizer.log.error(JSON.stringify(reqData[prop]), e);
                        }
                    }
                }
            }

            // split string for association-many
            if (fields[prop] && fields[prop].model && fields[prop].model.type === 'association-many' && reqData[prop] && typeof reqData[prop] === "string") {
                reqData[prop] = reqData[prop].split(",")
            }

            // HardFix: Long string was split as array of strings. https://github.com/balderdashy/sails/issues/7262
            if (fields[prop].model.type === 'string' && Array.isArray(reqData[prop])) {
                reqData[prop] = (reqData[prop] as string[]).join("");
            }
        }

        // callback before save modelResource
        let editConfig = modelResource.config.edit as CreateUpdateConfig;
        if (typeof editConfig.entityModifier === "function") {
            reqData = editConfig.entityModifier(reqData);
        }

        try {
            let newRecord = await modelResource.model.update(params, reqData, dataAccessor);
            await saveRelationsMediaManager(req.adminizer, fields, rawReqData, modelResource.model.modelname, newRecord[0].id)
            await updateCurrentHistoryMediaManagerData(req.adminizer, fields, rawReqData, modelResource.name, newRecord[0].id)


            Adminizer.log.debug(`Record was updated: `, newRecord);
            if (req.body.jsonPopupCatalog) {
                return res.json({record: newRecord})
            } else {

                await req.adminizer.emitAsync("model:updated", {
                    modelName: modelResource.name,
                    modelResource,
                    record: newRecord[0],
                    action: "update",
                });

                req.flash.setFlashMessage('success', req.i18n.__('Record was updated'));
                const redirectId = newRecord[0]?.[identifierField] ?? req.params.id;
                return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/${modelResource.name}/edit/${redirectId}`)
            }
        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
            return e;
        }
    } // END POST

    for (const field of Object.keys(fields)) {
        const fieldConfigConfig = fields[field].config as BaseFieldConfig;
        if (isMediaManagerFieldConfig(fieldConfigConfig)) {
            record[field] = await getRelationsMediaManager(req.adminizer, {
                mediaManagerId: (fieldConfigConfig.options as MediaManagerOptionsField)?.id ?? "default",
                model: modelResource.model.modelname,
                widgetName: field,
                modelId: id
            })
        }
    }
    const props = await inertiaAddHelper(req, modelResource, fields, record)
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


