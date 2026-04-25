import { POWCaptcha } from "../lib/POWCaptcha";
import passwordHash from "password-hash";
import {inertiaLoginHelper} from "../helpers/inertiaAutHelper";
import {Adminizer} from "../lib/Adminizer";
import {signUser} from "../lib/helper/jwt";
import {serialize} from "cookie";
import {UserAP} from "../models/UserAP";


export default async function login(req: ReqType, res: ResType) {
    const powCaptcha = new POWCaptcha();
    if (req.originalUrl.indexOf("login") >= 0) {
        if (!req.adminizer.config.auth.enable) {
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/`);
        }

        if (req.method.toUpperCase() === "POST") {
            let login = req.body.login;
            let password = req.body.password;
            let captchaSolution = req.body.captchaSolution;

            let user: UserAP;
            try {
                // TODO refactor CRUD functions for DataAccessor usage
                user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({ login: login });
            } catch (e) {
                return res.status(500).send({ error: e.message || 'Internal Server Error' });
            }

            if (req.body.pretend) {
                if (!user) {
                    return res.sendStatus(404);
                }
                if (req.user.isAdministrator) {
                    req.session.userPretended = user;

                    // Force full page reload after pretend
                    if (req.headers['x-inertia']) {
                        return res.writeHead(409, { 'x-inertia-location': `${req.adminizer.config.routePrefix}/` }).end();
                    }
                    return res.redirect(`${req.adminizer.config.routePrefix}/`);
                }

                if (req.headers['x-inertia']) {
                    return res.writeHead(409, { 'x-inertia-location': `${req.adminizer.config.routePrefix}/` }).end();
                }
                return res.redirect(`${req.adminizer.config.routePrefix}/`);
            }

            // Verify CAPTCHA solution if enabled
            if (req.adminizer.config.auth.captcha !== false) {
                const isCaptchaValid = powCaptcha.check(captchaSolution, `login:${req.ip}`);
                if (!isCaptchaValid) {
                    return inertiaAdminMessage(req, "Invalid CAPTCHA solution", 'captchaSolution');
                }
            }


            if (!user) {
                return inertiaAdminMessage(req, "Wrong username", 'login');
            } else {
                if (req.adminizer.config.registration.confirmationRequired && !user.isConfirmed && !user.isAdministrator) {
                    //Here we use the captchaSolution key to output messages unrelated to the form fields.
                    return inertiaAdminMessage(req, "Profile is not confirmed, please contact to administrator", 'captchaSolution');
                }

                if (passwordHash.verify(login + password + process.env.AP_PASSWORD_SALT, user.passwordHashed)) {
                    if (user.expires && Date.now() > Date.parse(user.expires)) {
                        //Here we use the captchaSolution key to output messages unrelated to the form fields.
                        return inertiaAdminMessage(req, "Profile expired, contact the administrator", 'captchaSolution');
                    }

                    if (!req.adminizer.accessRightsHelper.hasPermission('access-to-adminpanel', user)) {
                        return inertiaAdminMessage(req, "The user is not allowed to enter, please contact the administrator", 'captchaSolution');
                    }

                    const token = signUser({
                        id: user.id,
                        login: user.login,
                        isAdministrator: user.isAdministrator,
                    }, req.adminizer.jwtSecret);
                    res.setHeader('Set-Cookie', serialize('adminizer_jwt', token, {
                        httpOnly: true,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 60 * 60 * 24 * 7 * 2,
                    }));

                    const redirectTo = req.body.redirectTo as string;
                    const safeRedirect = redirectTo && redirectTo.startsWith('/') ? redirectTo : `${req.adminizer.config.routePrefix}/`;

                    // Force full page reload after login to prevent iframe issues
                    if (req.headers['x-inertia']) {
                        return res.writeHead(409, { 'x-inertia-location': safeRedirect }).end();
                    }

                    return res.redirect(safeRedirect);
                } else {
                    return inertiaAdminMessage(req, "Wrong password", 'password');
                }
            }
        }

        if (req.method.toUpperCase() === "GET") {
            // Generate new CAPTCHA task if enabled
            let captchaTask: number[] = [];
            if (req.adminizer.config.auth.captcha !== false) {
                captchaTask = await powCaptcha.getJob(`login:${req.ip}`);
            }
            return req.Inertia.render({
                component: 'login',
                props: {
                    description: req.adminizer.config.auth.description,
                    captchaTask: captchaTask,
                    ...inertiaLoginHelper(req),
                }
            })
        }

    } else if (req.originalUrl.indexOf("logout") >= 0) {
        if (req.session.userPretended && req.session.userPretended.id && req.user && req.user.id) {
            delete (req.session.userPretended);

            // Force full page reload after unpretend
            if (req.headers['x-inertia']) {
                return res.writeHead(409, { 'x-inertia-location': `${req.adminizer.config.routePrefix}/` }).end();
            }
            return res.redirect(`${req.adminizer.config.routePrefix}/`);
        }
        req.user = undefined;
        res.setHeader('Set-Cookie', serialize('adminizer_jwt', '', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            expires: new Date(0),
        }));

        // Force full page reload after logout
        if (req.headers['x-inertia']) {
            return res.writeHead(409, { 'x-inertia-location': `${req.adminizer.config.routePrefix}/model/userap/login` }).end();
        }
        return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }
    return res.status(404);
}

async function inertiaAdminMessage(req: ReqType, message: string, messageType: string) {
    Adminizer.log.warn(message)
    const powCaptcha = new POWCaptcha();
    // Generate new CAPTCHA task if enabled
    let captchaTask: number[] = [];
    if (req.adminizer.config.auth.captcha !== false) {
        captchaTask = await powCaptcha.getJob(`login:${req.ip}`);
    }

    let errors: Record<string, string> = {};
    errors[messageType] = req.i18n.__(message)
    return req.Inertia.render({
        component: 'login',
        props: {
            description: req.adminizer.config.auth.description,
            captchaTask: captchaTask,
            errors: errors,
            ...inertiaLoginHelper(req),
        }
    })
}
