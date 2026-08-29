import { FilterService } from "../../lib/filters/FilterService";
import { Filter } from "../../models/Filter";
import { User } from "../../models/User";

async function resolveDashboardUser(req: ReqType): Promise<User | null> {
    if (req.user) {
        return req.user as User;
    }

    const adminLogin = req.adminizer.config.administrator?.login ?? "admin";
    const userModel = req.adminizer.modelHandler.internal("widgets").get<User>("User");
    const user = await userModel.findOne({ where: { login: adminLogin } });
    return user ?? null;
}

export async function widgetFilterInfoController(req: ReqType, res: ResType) {
    const filterId = req.params.filterId;
    if (!filterId) {
        return res.status(404).send({ error: req.i18n.__("Not found") });
    }

    const user = await resolveDashboardUser(req);
    if (!user) {
        return res.status(401).send({ error: req.i18n.__("Unauthorized") });
    }

    const filterService = new FilterService(req.adminizer);

    let filter: Filter | null = null;
    try {
        filter = await filterService.getFilterById(filterId, user);
    } catch {
        filter = null;
    }

    if (!filter || !filterService.canViewFilter(filter, user)) {
        return res.status(404).send({ error: req.i18n.__("Not found") });
    }

    if (!await req.adminizer.accessRightsHelper.checkPermission(`read-${filter.modelName}-model`, user)) {
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

    return res.status(405).end();
}
