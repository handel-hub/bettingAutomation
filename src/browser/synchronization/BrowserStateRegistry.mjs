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
            if (updates.navigationContext.navigationId && state.navigationContext.navigationId !== updates.navigationContext.navigationId) {
                state.navigationEpoch++;
            }
            Object.assign(state.navigationContext, updates.navigationContext);
        }

        if (updates.windowContext) {
            Object.assign(state.windowContext, updates.windowContext);
        }

        if (updates.viewportContext) {
            Object.assign(state.viewportContext, updates.viewportContext);
        }

        if (updates.scrollContext) {
            Object.assign(state.scrollContext, updates.scrollContext);
        }

        if (updates.executionContext) {
            Object.assign(state.executionContext, updates.executionContext);
        }

        if (updates.consistencyState) {
            Object.assign(state.consistencyState, updates.consistencyState);
        }

        if (updates.recoveryState) {
            Object.assign(state.recoveryState, updates.recoveryState);
        }

        if (updates.synchronizationStatistics) {
            Object.assign(state.synchronizationStatistics, updates.synchronizationStatistics);
        }

        if (updates.capabilities) {
            for (const [cap, data] of Object.entries(updates.capabilities)) {
                if (typeof data === 'object' && data !== null) {
                    state.capabilities.setSatisfied(cap, data.value, data.epoch);
                } else {
                    state.capabilities.setSatisfied(cap, data);
                }
            }
        }

        this.emit('StateUpdated', { browserId, state });
    }
}

export const BrowserStateRegistry = new BrowserStateRegistryImpl();
