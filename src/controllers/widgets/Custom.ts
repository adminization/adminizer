import {CustomBase} from "../../lib/widgets/abstractCustom";
import {redirectToLogin} from '../../helpers/inertiaAutHelper';

export async function widgetCustomController(req: ReqType, res: ResType) {
	let widgetId = req.params.widgetId;
	if (!widgetId) {
		return res.status(404).send({ error: 'Not Found' });
	}

	if (req.adminizer.config.auth.enable) {
		if (!req.user) {
			return redirectToLogin(req, res);
		} else if (!req.adminizer.accessRightsHelper.hasPermission(`widget-${widgetId}`, req.user)) {
			return res.sendStatus(403);
		}
	}

	let widget = req.adminizer.widgetHandler.getById(widgetId) as CustomBase;
	if (widget === undefined) {
		return res.status(404).send({ error: 'Not Found' });
	}

	// /** get state */
	// if (req.method.toUpperCase() === 'GET') {
	// 	try{
	// 		let state = await widget.getState();
	// 		return res.json({state: state})
	// 	} catch (e){
	// 		return res.serverError(e)
	// 	}
	// }

	// /** Custom state  */
	// else if (req.method.toUpperCase() === 'POST') {
	// 	try{
	// 		let state = await widget.addOne();
	// 		return res.json({state: state})
	// 	} catch (e){
	// 		return res.serverError(e)
	// 	}
	// }
}
