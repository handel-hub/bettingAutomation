import { Capabilities } from '../capabilities.mjs';

/**
 * Stores the granular capability state for a browser independently from its lifecycle.
 */
export class BrowserCapabilities {
    constructor() {
        // Initialize all capabilities to false
        this.states = new Map();
        for (const capability of Object.values(Capabilities)) {
            this.states.set(capability, { satisfied: false, epoch: 0 });
        }
    }

    /**
     * Checks if a specific capability is currently satisfied for the given epoch.
     * @param {string} capability 
     * @param {number} currentEpoch 
     * @returns {boolean}
     */
    isSatisfied(capability, currentEpoch = 0) {
        const state = this.states.get(capability);
        if (!state) return false;
        if (state.epoch > 0 && state.epoch !== currentEpoch) return false;
        return state.satisfied === true;
    }

    /**
     * Checks if a list of capabilities is currently satisfied.
     * @param {string[]} capabilities 
     * @param {number} currentEpoch 
     * @returns {boolean}
     */
    areSatisfied(capabilities, currentEpoch = 0) {
        return capabilities.every(cap => this.isSatisfied(cap, currentEpoch));
    }

    /**
     * Returns the first capability in the list that is NOT satisfied.
     * @param {string[]} capabilities 
     * @param {number} currentEpoch 
     * @returns {string|null}
     */
    getBlockingCapability(capabilities, currentEpoch = 0) {
        for (const cap of capabilities) {
            if (!this.isSatisfied(cap, currentEpoch)) {
                return cap;
            }
        }
        return null;
    }

    /**
     * Updates the status of a capability.
     * Note: In this architecture, this should only be called by the BrowserStateRegistry.
     * @param {string} capability 
     * @param {boolean} value 
     * @param {number} epoch 
     */
    setSatisfied(capability, value, epoch = 0) {
        if (this.states.has(capability)) {
            const currentState = this.states.get(capability);
            this.states.set(capability, { 
                satisfied: value, 
                epoch: epoch > 0 ? epoch : currentState.epoch 
            });
        }
    }
}
