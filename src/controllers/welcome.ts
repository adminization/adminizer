import {redirectToLogin} from '../helpers/inertiaAutHelper';

/**
 * Welcome text
 */
export default function welcome(req: ReqType, res: ResType) {
    if (!req.user) {
        return redirectToLogin(req, res);
    }

    let text = ''
    let title = ''
    if ( Boolean((req.adminizer.configHelper.getConfig()).welcome) && Boolean((req.adminizer.configHelper.getConfig()).welcome.title) && Boolean((req.adminizer.configHelper.getConfig()).welcome.text)) {
        text = req.adminizer.configHelper.getConfig().welcome.text
        title = req.adminizer.configHelper.getConfig().welcome.title
    } else {
        text = `${req.i18n.__("This is opensource project")}: &nbsp;<a target="_blank" class="text-chart-1" href="https://github.com/adminization/adminizer">[GitHub]</a>`
    }

    const props = {
        title: title,
        text: text,
    }

    return req.Inertia.render({
        component: 'welcome',
        props: props
    });
};
