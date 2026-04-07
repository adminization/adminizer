import {redirectToLogin} from '../helpers/inertiaAutHelper';

export default async function getAllWidgets(req: ReqType, res: ResType) {
  if (req.adminizer.config.auth.enable) {
    if (!req.user) {
      return redirectToLogin(req, res);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`widgets`, req.user)) {
      return res.sendStatus(403);
    }
  }

  if (req.method.toUpperCase() === 'GET') {
    try {
      return res.json({ widgets: await req.adminizer.widgetHandler.getAll(req.user, req.i18n) })

    } catch (e) {
      return res.status(500).send({ error: e.message || 'Internal Server Error' });
    }
  }
}
