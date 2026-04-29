export default async function getAllWidgets(req: ReqType, res: ResType) {
  if (req.method.toUpperCase() === 'GET') {
    try {
      return res.json({ widgets: await req.adminizer.widgetHandler.getAll(req.user, req.i18n) })

    } catch (e) {
      return res.status(500).send({ error: e.message || 'Internal Server Error' });
    }
  }

  return res.status(405).end();
}
