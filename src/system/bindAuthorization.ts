import _login from "../controllers/login";
import _register from "../controllers/register";
import _initUser from "../controllers/initUser";
import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import {Adminizer} from "../lib/Adminizer";
import {generate} from "password-hash";
import { User } from "../models/User";
import { generateUserApiKey } from "../helpers/apiKeyHelper";

export default async function bindAuthorization(adminizer: Adminizer) {
    const userModel = adminizer.modelHandler.internal("auth").get<User>("User");

    let admins: User[];
    try {
        admins = await userModel.find({where: {isAdministrator: true}});
    } catch (e) {
        Adminizer.log.error("Error trying to find administrator", e)
        return;
    }


    /**
     * Router
     */
    let policies = adminizer.config.middlewares;
    let baseRoute = `${adminizer.config.routePrefix}/model/:modelResourceName`;


    let adminsCredentials: { fullName: string, login: string }[] = [];
    // if we have administrator profiles
    let config: AdminpanelConfig = adminizer.config;

    if (admins && admins.length) {
        for (let admin of admins) {
            adminsCredentials.push({
                fullName: admin.fullName,
                login: admin.login
            })
        }

        Adminizer.log.debug(`Has Administrators with login [${adminsCredentials[0].login}]`)

    } else if (process.env.ADMINPANEL_LAZY_GEN_ADMIN_ENABLE !== undefined) {
        let adminData;

        if (config.administrator && config.administrator.login && config.administrator.password) {
            adminData = config.administrator;
        } else {
            let password = getRandomInt(1000000000000, 9999999999999)
            adminData = {
                login: "admin",
                password: `${password}`
            }
        }

        try {
            let passwordHashed = generate(adminData.login + adminData.password + process.env.AP_PASSWORD_SALT);
            let password = 'masked';
            await userModel.create({
                login: adminData.login, passwordHashed: passwordHashed, fullName: "Administrator",
                isActive: true, isAdministrator: true,
                apiKey: generateUserApiKey()
            });
        } catch (e) {
            Adminizer.log.error("Error trying to create administrator", e)
            return;
        }

        console.group("Administrators credentials")
        console.table(adminsCredentials);
        console.groupEnd()

    } else if (process.env.ADMINPANEL_DEMO_ADMIN_ENABLE !== undefined) {
        try {
            let passwordHashed = generate("demodemo" + process.env.AP_PASSWORD_SALT);
            let password = 'masked';
            await userModel.create({
                login: 'demo', passwordHashed: passwordHashed, fullName: "Administrator",
                isActive: true, isAdministrator: true,
                apiKey: generateUserApiKey()
            });
        } catch (e) {
            Adminizer.log.error("Could not create demo administrator profile", e)
            return;
        }
    } else { // try to create one if we don't
        if (adminizer.config.auth.enable) {
            Adminizer.log.debug(`Adminpanel does not have an administrator`)
            adminizer.config.middlewares.push(initUserPolicy)
            //@ts-ignore
            adminizer.app.use(`${adminizer.config.routePrefix}/init_user`, _initUser);
        }
    }

    if (adminizer.config.auth.enable) {
        adminizer.app.use(baseRoute + '/login', adminizer.middlewareManager.bindMiddlewares(policies, _login));
        adminizer.app.use(baseRoute + '/logout', adminizer.middlewareManager.bindMiddlewares(policies, _login));
        adminizer.app.use(baseRoute + '/register', adminizer.middlewareManager.bindMiddlewares(policies, _register));
    }
};

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}


async function initUserPolicy(req: ReqType, res: ResType, proceed: any) {
    let admins: User[] = await req.adminizer.modelHandler.internal("auth").get<User>("User").find({where: {isAdministrator: true}});
    if (!admins || !admins.length) {
        return res.redirect(`${req.adminizer.config.routePrefix}/init_user`)
    }
    return proceed()
}


