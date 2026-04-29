import {SwitchBase} from "../../lib/widgets/abstractSwitch";

export async function widgetSwitchController(req: ReqType, res: ResType) {
	let widgetId = req.params.widgetId;
	if (!widgetId) {
		return res.status(404).send({ error: 'Not Found' });
	}

	let widget = req.adminizer.widgetHandler.getById(widgetId) as SwitchBase;
	if (widget === undefined) {
		return res.status(404).send({ error: 'Not Found' });
	}

	/** get state */
	if (req.method.toUpperCase() === 'GET') {
		try{
			let state = await widget.getState();
			return res.json({state: state})
		} catch (e){
			return res.status(500).send({ error: e.message || 'Internal Server Error' });
		}
	}

	/** Switch state  */
	else if (req.method.toUpperCase() === 'POST') {
		try{
			let state = await widget.switchIt();
			return res.json({state: state})
		} catch (e) {
			return res.status(500).send({ error: e.message || 'Internal Server Error' });
		}
	}

	return res.status(405).end();
}
