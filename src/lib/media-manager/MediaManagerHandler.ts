import {AbstractMediaManager} from "./AbstractMediaManager";
import {Adminizer} from "../Adminizer";

export class MediaManagerHandler {
    private managers = new Map<string, {
        resourceId: string;
        appName?: string;
        manager: AbstractMediaManager;
    }>();

    public add(manager: AbstractMediaManager) {
        this.register(undefined, manager);
    }

    public register(appName: string | undefined, manager: AbstractMediaManager): string {
        if (this.managers.has(manager.id)) {
            throw new Error(`MediaManager with id "${manager.id}" is already registered`);
        }

        const resourceId = appName ? `${appName}:${manager.id}` : manager.id;
        this.managers.set(manager.id, {
            resourceId,
            appName,
            manager,
        });
        return resourceId;
    }

    public unregister(resourceId: string): void {
        for (const [managerId, record] of this.managers) {
            if (record.resourceId === resourceId) {
                this.managers.delete(managerId);
                return;
            }
        }
    }

    public get(id: string): AbstractMediaManager {
        let instance = this.managers.get(id)?.manager;
        /** 
         * ✨ We magically get one
         */
        if (!instance && (id === 'default' || id === undefined) && this.managers.size === 1) {
            instance = this.managers.values().next().value?.manager;
        }
        if (!instance) {
            Adminizer.log.debug(`MediaManager with id ${id} not found`)
        }
        // Adminizer.log.debug(`ins`, instance)  // DEBUG: removed to reduce console noise
        return instance
    }

    public getByApp(appName: string): AbstractMediaManager[] {
        return Array.from(this.managers.values())
            .filter((record) => record.appName === appName)
            .map((record) => record.manager);
    }
}
