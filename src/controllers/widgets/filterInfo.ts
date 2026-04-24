import { FilterService } from "../../lib/filters/FilterService";
import { FilterAP } from "../../models/FilterAP";
import { UserAP } from "../../models/UserAP";

async function resolveDashboardUser(req: ReqType): Promise<UserAP | null> {
    if (req.user) {
        return req.user as UserAP;
    }

    const userModel = req.adminizer.modelHandler.model.get("UserAP");
    if (!userModel) {
        return null;
    }

    const adminLogin = req.adminizer.config.administrator?.login ?? "admin";
    // TODO refactor CRUD functions for DataAccessor usage
    const user = await userModel["_findOne"]({ login: adminLogin });
    return user ?? null;
}

export async function widgetFilterInfoController(req: ReqType, res: ResType) {
    const filterId = req.params.filterId;
    if (!filterId) {
        return res.status(404).send({ error: req.i18n.__("Not found") });
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission("widgets", req.user)) {
            return res.sendStatus(403);
        }
    }

    const user = await resolveDashboardUser(req);
    if (!user) {
        return res.status(401).send({ error: req.i18n.__("Unauthorized") });
    }

    const filterService = new FilterService(req.adminizer);

    let filter: FilterAP | null = null;
    try {
        filter = await filterService.getFilterById(filterId, user);
    } catch {
        filter = null;
    }

    if (!filter || !filterService.canViewFilter(filter, user)) {
        return res.status(404).send({ error: req.i18n.__("Not found") });
    }

    if (!req.adminizer.accessRightsHelper.hasPermission(`read-${filter.modelName}-model`, user)) {
        return res.sendStatus(403);
    }

    if (req.method.toUpperCase() === "GET") {
        try {
            const count = await filterService.countFilterResults(filter, user);
            return res.send(count >= 0 ? String(count) : "-");
        } catch (e) {
            return res.status(500).send({ error: e.message || req.i18n.__("Internal server error") });
        }
    }
}
