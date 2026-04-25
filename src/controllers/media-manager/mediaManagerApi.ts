import {MediaManagerHandler} from "../../lib/media-manager/MediaManagerHandler";
import {MediaManagerAdapter} from "./mediaManagerAdapter";
import {redirectToLogin} from '../../helpers/inertiaAutHelper';

export async function mediaManagerController(req: ReqType, res: ResType) {
    const method = req.method.toUpperCase();
    let id = req.params.id ? req.params.id : '';

    // const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    // await delay(1000);

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return redirectToLogin(req, res);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`mediaManager-${id}`, req.user)) {
            return res.sendStatus(403);
        }
    }

    if (!id) {
        return res.sendStatus(404)
    }
    const _manager = req.adminizer.mediaManagerHandler.get(id)
    const manager = new MediaManagerAdapter(_manager)
    if (method === 'GET') {
        if (req.query._method === 'getLocales') {
            return res.json({data: manager.getLocales(req)})
        }
        return await manager.get(req, res)
    }

    if (method === 'POST') {
        if (req.path.endsWith('/upload')) {
            return await manager.upload(req, res);
        }
        if (req.path.endsWith('/upload-variant')) {
            return await manager.uploadVariant(req, res)
        }
        switch (req.body._method) {
            case 'addMeta':
                return await manager.setMeta(req, res)
            case 'getMeta':
                return await manager.getMeta(req, res)
            case 'getChildren':
                return await manager.getVariants(req, res)
            case 'search':
                return await manager.search(req, res)
        }
    }
    if (method === 'DELETE') {
        return await manager.delete(req, res)
    }
}
