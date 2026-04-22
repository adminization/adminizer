import {AbstractMediaManager} from "./AbstractMediaManager";
import {Adminizer} from "../Adminizer";

export class MediaManagerHandler {
    private managers: AbstractMediaManager[] = []

    public add(manager: AbstractMediaManager) {
        this.managers.push(manager)
    }

    public get(id: string): AbstractMediaManager {
        let instance = this.managers.find(e => e.id === id)
        /** 
         * ✨ We magically get one
         */
        if (!instance && (id === 'default' || id === undefined) && this.managers.length === 1) {
            instance = this.managers[0]
        }
        if (!instance) {
            Adminizer.log.debug(`MediaManager with id ${id} not found`)
        }
        // Adminizer.log.debug(`ins`, instance)  // DEBUG: removed to reduce console noise
        return instance
    }
}
