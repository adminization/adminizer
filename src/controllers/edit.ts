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

    let entity = ControllerHelper.findEntityObject(req);
    
    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (!entity.config.edit) {
        return res.redirect(`${req.adminizer.config.routePrefix}/${entity.uri}`);
    }

    let record;
    let dataAccessor;
    const id = req.params.id
    try {
        dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "edit");
        record = await entity.model.findOne({id: id}, dataAccessor);
        if (!record) return res.status(404).send("Adminpanel > Record not found");
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        return res.status(500).send({error: 'Internal Server Error'});
    }

    let fields = dataAccessor.getFieldsConfig();

    // add deprecated 'records' to config
    fields = await FieldsHelper.loadAssociations(req, fields, "edit");

    // Save
    if (req.method.toUpperCase() === 'POST') {
        const identifierField = entity.config.identifierField || req.adminizer.config.identifierField;
        delete req.body.redirectUrl

        let reqData = RequestProcessor.processRequest(req, fields);
        let params: {
            [key: string]: number | string
        } = {};
        params[entity.config.identifierField || req.adminizer.config.identifierField] = req.params.id;

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


            // delete property from association-many and association if empty
            // TODO check if adding and deleting associations works for other orm (this code was written for waterline)
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

        // callback before save entity
        let entityEdit = entity.config.edit as CreateUpdateConfig;
        if (typeof entityEdit.entityModifier === "function") {
            reqData = entityEdit.entityModifier(reqData);
        }

        try {
            let newRecord = await entity.model.update(params, reqData, dataAccessor);
            await saveRelationsMediaManager(req.adminizer, fields, rawReqData, entity.model.modelname, newRecord[0].id)
            await updateCurrentHistoryMediaManagerData(req.adminizer, fields, rawReqData, entity.name, newRecord[0].id)


            Adminizer.log.debug(`Record was updated: `, newRecord);
            if (req.body.jsonPopupCatalog) {
                return res.json({record: newRecord})
            } else {

                // update navigation tree after model updated
                if (req.adminizer.config.navigation) {
                    for (const section of req.adminizer.config.navigation.sections) {
                        let navigation = req.adminizer.catalogHandler.getCatalog('navigation')
                        navigation.setId(section)
                        let navItem = navigation.itemTypes.find(item => item.type === entity.name.toLowerCase())
                        if (navItem) {
                            await navItem.updateModelItems(newRecord[0].id, {record: newRecord[0]}, section)
                        }
                    }
                }

                req.flash.setFlashMessage('success', req.i18n.__('Record was updated'));
                const redirectId = newRecord[0]?.[identifierField] ?? req.params.id;
                return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/${entity.name}/edit/${redirectId}`)
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
                model: entity.model.modelname,
                widgetName: field,
                modelId: id
            })
        }
    }
    const props = inertiaAddHelper(req, entity, fields, record)
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
