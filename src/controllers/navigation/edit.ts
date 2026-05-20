import {ControllerHelper} from "../../helpers/controllerHelper";
import {DataAccessor} from "../../lib/DataAccessor";

export default async function edit(req: ReqType, res: ResType) {
	let modelResource = ControllerHelper.findModelResource(req);
	let dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "edit");
	let record: any = await modelResource.model.findOne({where: {id: req.params.id}}, dataAccessor);
	return res.redirect(`${req.adminizer.config.routePrefix}/catalog/navigation/${record.label}`)
}


