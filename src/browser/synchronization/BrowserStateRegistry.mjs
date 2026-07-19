import { BrowserStateModel } from './models/BrowserStateModel.mjs';
import EventEmitter from 'node:events';

/**
 * A central registry holding BrowserStateModel instances.
 * This is the authoritative owner of mutations for BrowserStateModel.
 */
class BrowserStateRegistryImpl extends EventEmitter {
    constructor() {
        super();
        this.states = new Map();
    }

    /**
     * Retrieves the state model for a browser. Creates one if it doesn't exist.
     * @param {string} browserId 
     * @returns {BrowserStateModel}
     */
    getState(browserId) {
        if (!this.states.has(browserId)) {
            this.states.set(browserId, new BrowserStateModel(browserId));
        }
        return this.states.get(browserId);
    }

    /**
     * Mutates the state of a browser and emits an update event.
     * @param {string} browserId 
     * @param {Object} updates 
     */
    update(browserId, updates) {
        const state = this.getState(browserId);
        
        if (updates.lifecycleState !== undefined) {
            state.lifecycleState = updates.lifecycleState;
        }

        if (updates.healthMetrics) {
            Object.assign(state.healthMetrics, updates.healthMetrics);
        }

        if (updates.runtimeStatistics) {
            Object.assign(state.runtimeStatistics, updates.runtimeStatistics);
        }

        if (updates.navigationContext) {
            Object.assign(state.navigationContext, updates.navigationContext);
        }

        if (updates.capabilities) {
            for (const [cap, value] of Object.entries(updates.capabilities)) {
                state.capabilities.setSatisfied(cap, value);
            }
        }

        this.emit('StateUpdated', { browserId, state });
    }
}

export const BrowserStateRegistry = new BrowserStateRegistryImpl();
