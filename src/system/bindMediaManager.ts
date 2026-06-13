import {Adminizer} from "../lib/Adminizer";
import serveStatic from "serve-static";
import path from "path";

export default function bindMediaManager(adminizer: Adminizer) {
    if (adminizer.config.bind?.public && adminizer.config.mediamanager?.fileStoragePath) {
        adminizer.app.use("/public", serveStatic(adminizer.config.mediamanager.fileStoragePath));
    }

    adminizer.app.use(
        `${adminizer.config.routePrefix}/fileicons`,
        serveStatic(path.join(import.meta.dirname, "../fileicons"))
    );
}
