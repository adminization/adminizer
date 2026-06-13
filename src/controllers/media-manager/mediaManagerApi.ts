import {MediaManagerAdapter} from "./mediaManagerAdapter";

export async function mediaManagerController(req: ReqType, res: ResType) {
    const method = req.method.toUpperCase();
    const id = req.params.id ? req.params.id : "";

    if (!id) {
        return res.sendStatus(404);
    }
    const mediaManager = req.adminizer.mediaManagerHandler.get(id);
    const manager = new MediaManagerAdapter(mediaManager);
    if (method === "GET") {
        if (req.query._method === "getLocales") {
            return res.json({data: manager.getLocales(req)});
        }
        return await manager.get(req, res);
    }

    if (method === "POST") {
        if (req.path.endsWith("/upload")) {
            return await manager.upload(req, res);
        }
        if (req.path.endsWith("/upload-variant")) {
            return await manager.uploadVariant(req, res);
        }
        switch (req.body._method) {
            case "addMeta":
                return await manager.setMeta(req, res);
            case "getMeta":
                return await manager.getMeta(req, res);
            case "getChildren":
                return await manager.getVariants(req, res);
            case "search":
                return await manager.search(req, res);
        }
    }
    if (method === "DELETE") {
        return await manager.delete(req, res);
    }
}
