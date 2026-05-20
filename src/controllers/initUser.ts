import {Adminizer} from "../lib/Adminizer";
import {generate} from "password-hash";
import {inertiaInitUserHelper} from "../helpers/inertiaAutHelper";
import { UserAP } from "../models/UserAP";
import { generateUserApiKey } from "../helpers/apiKeyHelper";

export default async function initUser(req: ReqType, res: ResType) {
    if (!req.adminizer.config.auth.enable) {
        return res.redirect(`${req.adminizer.config.routePrefix}/`);
    }

    const userModel = req.adminizer.modelHandler.internal("auth").get<UserAP>("UserAP");
    let admins: UserAP[] = await userModel.find({where: {isAdministrator: true}});
    if (admins.length) {
        res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }

    if (req.method.toUpperCase() === "POST") {
        let login = req.body.login;
        let locale = req.body.locale;
        let password = req.body.password;

        for (const key of ["login", "password", "confirmPassword"]) {
            if (!req.body[key]) {
                let errors: Record<string, string> = {};
                errors[key] = "Missing required parameters";
                return req.Inertia.render({
                    component: "init-user",
                    props: {
                        errors: errors,
                        ...inertiaInitUserHelper(req)
                    }
                })
            }
        }

        try {
            Adminizer.log.debug(`Created admin`)
            let passwordHashed = generate(login + password +  process.env.AP_PASSWORD_SALT);
            password = 'masked';
            await userModel.create(
                {
                    login: login,
                    passwordHashed: passwordHashed,
                    fullName: "Administrator",
                    isActive: true,
                    ...(locale !== undefined && {locale}),
                    isAdministrator: true,
                    apiKey: generateUserApiKey()
                }
            );
        } catch (e) {
            Adminizer.log.error("Could not create administrator profile", e)
            return req.Inertia.render({
                component: "init-user",
                props: {
                    errors: {
                        login: "Could not create administrator profile"
                    },
                    ...inertiaInitUserHelper(req)
                }
            })
        }

        return req.Inertia.redirect(`${req.adminizer.config.routePrefix}`)
    }

    if (req.method.toUpperCase() === "GET") {
        return req.Inertia.render({
            component: "init-user",
            props: inertiaInitUserHelper(req)
        })
    }
};
