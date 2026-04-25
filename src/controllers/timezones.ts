import {redirectToLogin} from '../helpers/inertiaAutHelper';

export default async function timezones(req: ReqType, res: ResType) {
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return redirectToLogin(req, res);
        }
    }

    let timezones = []
    for (let timezone of req.adminizer.config.timezones) {
        timezones.push({
            value: timezone.id,
            label: timezone.name
        })
    }
    return res.json({timezones: timezones})

}
