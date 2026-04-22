import { Adminizer } from "../Adminizer";
import { AbstractHistoryAdapter } from "./AbstractHistoryAdapter";

export class HistoryHandler {
    private adapters: AbstractHistoryAdapter[] = [];

    public add(adapter: AbstractHistoryAdapter) {
        this.adapters.push(adapter)
    }

    public get(id: string) {
        let instance = this.adapters.find(a => a.id === id);

        // ✨ We magically get one
        if (!instance && (id === 'default' || id === undefined) && this.adapters.length === 1) {
            instance = this.adapters[0]
        }
        if (!instance) {
            Adminizer.log.debug(`HistoryAdapter with id ${id} not found`)
        }
        // Adminizer.log.debug(`ins`, instance)  // DEBUG: removed to reduce console noise
        return instance
    }
}