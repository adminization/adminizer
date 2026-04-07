export function redirectToLogin(req: ReqType, res: ResType): void {
    const loginUrl = `${req.adminizer.config.routePrefix}/model/userap/login`;
    const redirectTo = encodeURIComponent(req.originalUrl);
    res.redirect(`${loginUrl}?redirectTo=${redirectTo}`);
}

export function inertiaLoginHelper(req: ReqType) {
    let props: Record<string, unknown> = {};
    props.login = req.i18n.__('Login');
    props.password = req.i18n.__('Password');
    props.title = req.i18n.__("Welcome");
    props.submitButton = req.i18n.__("Log in");
    props.submitLink = `${req.adminizer.config.routePrefix}/model/userap/login`
    props.redirectTo = (req.query?.redirectTo as string) || '';
    if (req.adminizer.config.registration?.enable === true) {
        props.registerLink = {
            title: req.i18n.__("Register"),
            link: `${req.adminizer.config.routePrefix}/model/userap/register`
        };
    }
    // Optional additional link at the bottom of login page
    const addPage = req.adminizer.config.auth?.addishinalLoginPage;
    if (addPage && typeof addPage.link === 'string' && addPage.link.length > 0) {
        const raw = addPage.link;
        let link = raw;
        if (/^https?:\/\//i.test(raw)) {
            link = raw; // absolute URL
        } else if (raw.startsWith(`/${req.adminizer.config.routePrefix}`)) {
            link = `${raw}`;
        } else {
            link = `${req.adminizer.config.routePrefix}/${raw}`;
        }
        props.addishinalLoginPage = {
            title: req.i18n.__(addPage.textKey || 'Additional login page'),
            link,
        };
    }
    return props
}

export function inertiaRegisterHelper(req: ReqType) {
    let props: Record<string, unknown> = {};
    props.submitLink = `${req.adminizer.config.routePrefix}/model/userap/register`
    props.header = {
        title: req.i18n.__("Create an Account"),
        desc: req.i18n.__("Please fill out the fields below")
    }
    props.loginLabel = req.i18n.__("Login");
    props.fullNameLabel = req.i18n.__("Full Name");
    props.passwordLabel = req.i18n.__("Password");
    props.confirmPasswordLabel = req.i18n.__("Confirm Password*");
    props.confirmError = req.i18n.__("Passwords do not match!");
    props.emailLabel = req.i18n.__("Email");
    props.localeLabel = req.i18n.__("Locale");
    props.submitButton = req.i18n.__("Register");
    props.backToLogin = {
        link: `${req.adminizer.config.routePrefix}/model/userap/login`,
        text: req.i18n.__("Back to Login")
    }
    return props
}

export function inertiaInitUserHelper(req: ReqType) {
    let props: Record<string, unknown> = {};
    props.submitLink = `${req.adminizer.config.routePrefix}/init_user`
    props.header = {
        title: req.i18n.__("Welcome"),
        desc: req.i18n.__("Create a new administrator")
    }
    props.loginLabel = req.i18n.__("Login");
    props.passwordLabel = req.i18n.__("Password");
    props.confirmPasswordLabel = req.i18n.__("Confirm Password");
    props.confirmError = req.i18n.__("Passwords do not match!");
    props.localeLabel = req.i18n.__("Locale");
    props.submitButton = req.i18n.__("Create");
    props.locales = req.adminizer.config?.translation ? req.adminizer.config.translation.locales: ['en'];
    props.defaultLocale = req.adminizer.config?.translation ? req.adminizer.config.translation.defaultLocale: 'en';
    return props
}
