import { BrowserStateRegistry } from './BrowserStateRegistry.mjs';

/**
 * The orchestrator. Coordinates the barrier and queries the BrowserStateRegistry.
 */
class SynchronizationManagerImpl {
    constructor() {
        this.providers = []; // Extension point for CapabilityProvider instances
    }

    /**
     * Registers a new capability provider.
     * @param {CapabilityProvider} provider 
     */
    registerProvider(provider) {
        this.providers.push(provider);
    }

    /**
     * Waits for the specified capabilities to be satisfied.
     * @param {string} browserId 
     * @param {string[]} capabilities 
     * @param {number} deadline Absolute epoch timestamp
     * @returns {Promise<Object>}
     */
    async awaitCapabilities(browserId, capabilities, deadline) {
        // Stage 2.2 Stub: 
        // Just queries the BrowserStateRegistry and checks if they are currently satisfied.
        // In future stages, this will loop and invoke providers until the deadline is reached.
        
        const state = BrowserStateRegistry.getState(browserId);
        const blocking = state.capabilities.getBlockingCapability(capabilities);
        
        if (!blocking) {
            return {
                satisfied: true,
                missingCapabilities: []
            };
        }

        // Identify which capabilities are still missing
        const missing = capabilities.filter(cap => !state.capabilities.isSatisfied(cap));

        return {
            satisfied: false,
            blockingCapability: blocking,
            missingCapabilities: missing
        };
    }
}

export const SynchronizationManager = new SynchronizationManagerImpl();
