import {generate} from "password-hash";
import{ inertiaRegisterHelper} from "../helpers/inertiaAutHelper";
import { UserAP } from "../models/UserAP";
import { GroupAP } from "../models/GroupAP";
import { generateUserApiKey } from "../helpers/apiKeyHelper";

export default async function register(req: ReqType, res: ResType) {
    if (!req.adminizer.config.auth.enable || req.adminizer.config.registration?.enable !== true) {
        return res.redirect(`${req.adminizer.config.routePrefix}/`);
    }
    const authModels = req.adminizer.modelHandler.internal("auth");
    const userModel = authModels.get<UserAP>("UserAP");
    const groupModel = authModels.get<GroupAP>("GroupAP");

    if (req.method.toUpperCase() === "POST") {
        

        for (const key of ["login", "fullName", "password"]) {
            if (!req.body[key]) {
                let errors: Record<string, string> = {};
                errors[key] = "Missing required parameters";
                return req.Inertia.render({
                    component: "register",
                    props: {
                        errors: errors,
                        ...inertiaRegisterHelper(req)
                    }
                })
            }
        }

        let user: UserAP;
        try {
            user = await userModel.findOne({where: {login: req.body.login}});
        } catch (e) {
            return res.status(500).send({error: e.message || 'Internal Server Error'});
        }

        if (user) {
            return req.Inertia.render({
                component: "register",
                props: {
                    errors: {
                        login: "This login is already registered, please try another one"
                    },
                    ...inertiaRegisterHelper(req)
                }
            })
        } else {
            try {
                let passwordHashed = generate(req.body.login + req.body.password + process.env.AP_PASSWORD_SALT);
                let password = 'masked';
                let userap: UserAP = await userModel.create({
                    login: req.body.login,
                    passwordHashed: passwordHashed,
                    fullName: req.body.fullName,
                    email: req.body.email,
                    locale: req.body.locale,
                    apiKey: generateUserApiKey()
                });
                let defaultUserGroup: GroupAP = await groupModel.findOne({where: {name: req.adminizer.config.registration.defaultUserGroup}});
                
                await userModel.updateOne({where: {id: userap.id}}, {
                    groups: [defaultUserGroup.id]
                }); // instead of UserAP.addToCollection;

                return req.Inertia.redirect(`${req.adminizer.config.routePrefix}`)
            } catch (e) {
                return res.status(500).send({error: e.message || 'Internal Server Error'});
            }
        }
    }

    if (req.method.toUpperCase() === "GET") {
        return req.Inertia.render({
            component: "register",
            props: inertiaRegisterHelper(req),
        });
    }
};
