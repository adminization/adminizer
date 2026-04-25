import {ActionBase} from "../../lib/widgets/abstractAction";
import {redirectToLogin} from '../../helpers/inertiaAutHelper';

export async function widgetActionController(req: ReqType, res: ResType) {
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

	let widget = req.adminizer.widgetHandler.getById(widgetId) as ActionBase;
	if(widget === undefined){
		return res.status(404).send({ error: 'Not Found' });
	}

	else if (req.method.toUpperCase() === 'POST') {
		try {
			await widget.action();
			return res.json({ok: true})
		} catch (error) {
			return res.json(error)
		}
	}
}
