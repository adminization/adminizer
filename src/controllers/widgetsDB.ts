export default async function widgetsDB(req: ReqType, res: ResType) {
    let id: number = 0
    let auth = req.adminizer.config.auth.enable
    if (req.user) {
        id = req.user.id
    }

    if (req.method.toUpperCase() === 'GET') {
        try {
            let widgets = await req.adminizer.widgetHandler.getWidgetsDB(id, auth, req.i18n);
            return res.json({widgetsDB: widgets})
        } catch (e) {
            return res.status(500).send({error: e.message || 'Internal Server Error'});
        }
    }

    if (req.method.toUpperCase() === 'POST') {
        if (!req.body.widgets) {
            return res.send('Invalid data')
        }
        try {
            return res.json({
                userID: await req.adminizer.widgetHandler.setWidgetsDB(id, req.body, auth),
                status: 'ok'
            })
        } catch (e) {
            return res.status(500).send({error: e.message || 'Internal Server Error'});
        }
    }

    return res.status(405).end();
}
