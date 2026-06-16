import {ActionBase} from "../../lib/widgets/abstractAction";

export async function widgetActionController(req: ReqType, res: ResType) {
	let widgetId = req.params.widgetId;
	if (!widgetId) {
		return res.status(404).send({ error: 'Not Found' });
	}

	let widget = req.adminizer.widgetHandler.getById(widgetId) as ActionBase;
	if(widget === undefined){
		return res.status(404).send({ error: 'Not Found' });
	}

	else if (req.method.toUpperCase() === 'POST') {
		try {
			const data = await widget.action();
			if (data && typeof data === "object" && !Array.isArray(data)) {
				return res.json({ok: true, ...data})
			}
			return res.json({ok: true, data})
		} catch (error) {
			return res.json(error)
		}
	}

	return res.status(405).end();
}
