import {ControllerHelper} from "../helpers/controllerHelper";
import {deleteRelationsMediaManager} from "../lib/media-manager/helpers/MediaManagerHelper";
import {ModelAnyField, ModelAnyInstance} from "../lib/model/AbstractModel";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";

export default async function remove(req: ReqType, res: ResType) {
    // Checking id of the record
    if (!req.params.id) {
        Adminizer.log.error(new Error('Admin panel: No id for record provided'));
        return res.status(404).send({error: 'Not Found'});
    }
    let referTo = decodeURIComponent(req.query.referTo as string)

    let modelResource = ControllerHelper.findModelResource(req);
    if (!modelResource.model) {
        Adminizer.log.error(new Error('Admin panel: no model found'));
        return res.status(404).send({error: 'Not Found'});
    }

    if (!modelResource.config.remove) {
        return res.redirect(`${req.adminizer.config.routePrefix}/${modelResource.uri}`);
    }

    /**
     * Searching for record by model
     */
    let record: ModelAnyInstance;
    let dataAccessor;
    try {
        dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "remove");
        record = await modelResource.model.findOne({where: {id: req.params.id}}, dataAccessor) as ModelAnyInstance;
    } catch (e) {
        if (req.accepts('json')) {
            return res.json({
                success: false,
                message: e.message
            });
        }
        return res.status(500).send({error: e.message || 'Internal Server Error'});
    }

    if (!record) {
        let msg = 'Admin panel: No record found with id: ' + req.params.id;
        if (req.accepts('json')) {
            return res.json({
                success: false,
                message: msg
            });
        }
        return res.status(404).send({error: 'Not Found'});
    }
    // adminizer.log.debug('admin > remove > record > ', record);

    let destroyedRecord;
    try {
        const fieldId = modelResource.config.identifierField ?? req.adminizer.config.identifierField;
        const q: Record<string, ModelAnyField> = {}
        q[fieldId] = record[fieldId]
        destroyedRecord = await modelResource.model.destroy(q, dataAccessor)
        console.log(destroyedRecord[0])
        // delete relations media manager
        await deleteRelationsMediaManager(req.adminizer, modelResource.name, destroyedRecord)
    } catch (e) {
        Adminizer.log.error('adminpanel > error', e);
    }

    if (destroyedRecord) {


        req.flash.setFlashMessage('success', req.i18n.__('Record was removed successfully !'));

    } else {
        req.flash.setFlashMessage('error', req.i18n.__('Record was not removed'));
    }
    let referToUrl = referTo ? `${modelResource.uri}${referTo}` : `${modelResource.uri}`
    return req.Inertia.redirect(`${referToUrl}`)
};


