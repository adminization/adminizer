import type {AccessRightsToken} from "../../interfaces/types";
import type {Adminizer} from "../Adminizer";

export interface AccessRightsRecord {
    id: string;
    appName: string;
    token: AccessRightsToken;
}

export class AccessRightsHandler {
    private records = new Map<string, AccessRightsRecord>();

    constructor(private adminizer: Adminizer) {}

    register(appName: string, token: AccessRightsToken): string {
        const normalizedToken = {
            ...token,
            id: token.id.toLowerCase(),
        };
        const id = this.getRecordId(appName, normalizedToken.id);

        if (this.records.has(id)) {
            throw new Error(`Access rights token "${normalizedToken.id}" is already registered for app "${appName}"`);
        }

        const existingOwner = this.getTokenOwner(normalizedToken.id);
        if (existingOwner && existingOwner !== appName) {
            throw new Error(`Access rights token "${normalizedToken.id}" is already registered by app "${existingOwner}"`);
        }

        if (!existingOwner && this.adminizer.accessRightsHelper.hasToken(normalizedToken.id)) {
            throw new Error(`Access rights token "${normalizedToken.id}" is already registered`);
        }

        this.adminizer.accessRightsHelper.registerToken(normalizedToken);
        this.records.set(id, {
            id,
            appName,
            token: normalizedToken,
        });

        this.adminizer.emitter.emit("app:access-right:registered", {
            appName,
            resourceId: id,
            tokenId: normalizedToken.id,
        });

        return id;
    }

    unregister(id: string): void {
        const record = this.records.get(id);
        if (!record) {
            return;
        }

        this.adminizer.accessRightsHelper.unregisterToken(record.token.id);
        this.records.delete(id);

        this.adminizer.emitter.emit("app:access-right:unregistered", {
            appName: record.appName,
            resourceId: id,
            tokenId: record.token.id,
        });
    }

    getByApp(appName: string): AccessRightsRecord[] {
        return Array.from(this.records.values()).filter((record) => record.appName === appName);
    }

    private getRecordId(appName: string, tokenId: string): string {
        return `${appName}:${tokenId}`;
    }

    private getTokenOwner(tokenId: string): string | undefined {
        for (const record of this.records.values()) {
            if (record.token.id === tokenId) {
                return record.appName;
            }
        }

        return undefined;
    }
}
