import { parse } from "cookie";
import { verifyUser } from "../lib/helper/jwt";

export default async function checkAuth(req: ReqType, res: ResType, proceed: () => void) {
    let locale: string = ""

    if (typeof req.adminizer.config.translation !== 'boolean') {
        locale = req.adminizer.config.translation.defaultLocale
    }

    if (!req.adminizer.config.auth.enable) {
        if (req.user) {
            req.user.isAdministrator = true;
        } else {
            req.user = {
                id: 0,
                login: "No Auth",
                isAdministrator: true,
                locale: locale
            }
        }
    }
    return proceed()
}
