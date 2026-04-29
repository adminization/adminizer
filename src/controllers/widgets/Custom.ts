import {CustomBase} from "../../lib/widgets/abstractCustom";

export async function widgetCustomController(req: ReqType, res: ResType) {
	let widgetId = req.params.widgetId;
	if (!widgetId) {
		return res.status(404).send({ error: 'Not Found' });
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

	return res.status(405).end();
}
