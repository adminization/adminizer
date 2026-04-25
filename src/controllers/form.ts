import {FormHelper} from "../helpers/formHelper";
import {Adminizer} from "../lib/Adminizer";
import inertiaFormHelper from "../helpers/inertiaFromHelper";
import {getRelationsMediaManager, saveRelationsMediaManager} from "../lib/media-manager/helpers/MediaManagerHelper";
import {MediaManagerOptionsField} from "../interfaces/adminpanelConfig";
import {MediaManagerHandler} from "../lib/media-manager/MediaManagerHandler";
import {redirectToLogin} from '../helpers/inertiaAutHelper';

export default async function form(req: ReqType, res: ResType) {
    let slug = req.params.slug;

    // Check slug
    if (!slug) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return redirectToLogin(req, res);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`update-${slug}-form`, req.user)) {
            return res.sendStatus(403);
        }
    }
    let form = FormHelper.get(req.adminizer, slug);

    if (!form) {
        return res.status(404).send("Adminpanel > Form not found");
    }

    if (req.method.toUpperCase() === "POST") {
        if (!req.body) {
            return res.status(500).send("Data is empty");
        }
        for (let prop in req.body) {
            if (form[prop].type === 'json' && typeof req.body[prop] === 'string') {
                try {
                    req.body[prop] = JSON.parse(req.body[prop]);
                } catch (e) {
                    if (typeof req.body[prop] === "string" && req.body[prop].replace(/(\r\n|\n|\r|\s{2,})/gm, "") && e.message !== "Unexpected end of JSON input" && !/Unexpected (token .|number) in JSON at position \d/.test(e.message)) {
                        Adminizer.log.error(JSON.stringify(req.body[prop]), e);
                    }
                }
            }
        }

        // checkboxes processing
        let checkboxes = [];
        for (let key in form) {
            if (form[key].type === "boolean") {
                checkboxes.push(key);
            }
            if(form[key].type === "mediamanager") {
                let options = form[key].options as MediaManagerOptionsField;
                let mediaManager = req.adminizer.mediaManagerHandler.get(options?.id ?? "default")
                if(req.body[key]) await mediaManager.setRelations(req.body[key], `${slug}_${key}`, 0, key)
            }
        }

        for (let field of Object.keys(req.body)) {
            await req.adminizer.config.forms.set(slug, field, req.body[field]);
        }

        for (let field of checkboxes) {
            if (!req.body[field]) {
                await req.adminizer.config.forms.set(slug, field, false);
            }
        }


        return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/form/${slug}`);
    }

    for (let key of Object.keys(form)) {
        try {
            if (form[key].type === 'mediamanager') {
                form[key].value = await getRelationsMediaManager(req.adminizer, {
                    mediaManagerId: (form[key].options as MediaManagerOptionsField)?.id ?? "default",
                    model: `${slug}_${key}`,
                    widgetName: key,
                    modelId: 0
                })
            } else {
                form[key].value = await req.adminizer.config.forms.get(slug, key);
            }
        } catch (e) {
            Adminizer.log.silly(`'${slug}' property was not found in storage, using source file`);
        }
    }

    const props = inertiaFormHelper(req, `${req.adminizer.config.routePrefix}/form/${slug}`, form)

    return req.Inertia.render({
        component: 'form',
        props: props
    });
}
