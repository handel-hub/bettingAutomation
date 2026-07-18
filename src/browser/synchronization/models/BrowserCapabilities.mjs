import { Capabilities } from '../capabilities.mjs';

/**
 * Stores the granular capability state for a browser independently from its lifecycle.
 */
export class BrowserCapabilities {
    constructor() {
        // Initialize all capabilities to false
        this.states = new Map();
        for (const capability of Object.values(Capabilities)) {
            this.states.set(capability, false);
        }
    }

    /**
     * Checks if a specific capability is currently satisfied.
     * @param {string} capability 
     * @returns {boolean}
     */
    isSatisfied(capability) {
        return this.states.get(capability) === true;
    }

    /**
     * Checks if a list of capabilities is currently satisfied.
     * @param {string[]} capabilities 
     * @returns {boolean}
     */
    areSatisfied(capabilities) {
        return capabilities.every(cap => this.isSatisfied(cap));
    }

    /**
     * Returns the first capability in the list that is NOT satisfied.
     * @param {string[]} capabilities 
     * @returns {string|null}
     */
    getBlockingCapability(capabilities) {
        for (const cap of capabilities) {
            if (!this.isSatisfied(cap)) {
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
     */
    setSatisfied(capability, value) {
        if (this.states.has(capability)) {
            this.states.set(capability, value);
        }
    }
}
