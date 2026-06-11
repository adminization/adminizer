import {InfoBase} from "../../lib/widgets/abstractInfo";

export async function widgetInfoController(req: ReqType, res: ResType) {
	let widgetId = req.params.widgetId;
	if (!widgetId) {
		return res.status(404).send({ error: 'Not Found' });
	}

	let widget = req.adminizer.widgetHandler.getById(widgetId) as InfoBase;
	if (widget === undefined) {
		return res.status(404).send({ error: 'Not Found' });
	}

	/** get state */
	if (req.method.toUpperCase() === 'GET') {
		try {
			let text = await widget.getInfo({ user: req.user });
			return res.send(text)
		} catch (e) {
			return res.status(500).send({ error: e.message || 'Internal Server Error' });
		}
	}

	return res.status(405).end();
}
