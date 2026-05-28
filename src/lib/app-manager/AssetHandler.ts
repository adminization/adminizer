import path from "path";
import type {Adminizer} from "../Adminizer";
import type {AppAsset} from "./AdminizerApp";

interface AssetRecord {
    id: string;
    appName: string;
    url: string;
    controllerId?: string;
}

export class AssetHandler {
    private assets = new Map<string, AssetRecord>();

    constructor(private adminizer: Adminizer) {}

    register(appName: string, asset: AppAsset): string {
        const id = `${appName}:${asset.id}`;
        if (this.assets.has(id)) {
            throw new Error(`Asset "${id}" is already registered`);
        }

        if (process.env.ADMINIZER_ENV === "dev" && asset.devUrl) {
            this.assets.set(id, {
                id,
                appName,
                url: asset.devUrl,
            });
            this.adminizer.emitter.emit("app:asset:registered", {
                appName,
                resourceId: id,
                url: asset.devUrl,
                mode: "dev",
            });
            return asset.devUrl;
        }

        const fileName = path.basename(asset.filePath);
        const route = asset.route ?? `/app-assets/${appName}/${asset.id}/${fileName}`;
        const url = this.adminizer.controllerHandler.register(appName, {
            id: `asset:${asset.id}`,
            method: "get",
            route,
            middleware: (_req, res) => res.sendFile(asset.filePath),
        });

        this.assets.set(id, {
            id,
            appName,
            url,
            controllerId: `${appName}:asset:${asset.id}`,
        });
        this.adminizer.emitter.emit("app:asset:registered", {
            appName,
            resourceId: id,
            url,
            mode: "static",
        });

        return url;
    }

    unregister(id: string): void {
        const record = this.assets.get(id);
        if (!record) {
            return;
        }

        if (record.controllerId) {
            this.adminizer.controllerHandler.unregister(record.controllerId);
        }

        this.assets.delete(id);
        this.adminizer.emitter.emit("app:asset:unregistered", {
            appName: record.appName,
            resourceId: id,
            url: record.url,
        });
    }

    getByApp(appName: string): AssetRecord[] {
        return Array.from(this.assets.values()).filter((record) => record.appName === appName);
    }
}
