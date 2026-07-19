/**
 * A pure interface representing an extension point for capability satisfaction.
 * Providers do not access infrastructure directly. They operate on `syncContext`.
 */
export class CapabilityProvider {
    /**
     * Returns the array of capabilities this provider owns.
     * @returns {string[]} e.g., ['DOM_READY']
     */
    supportedCapabilities() {
        throw new Error("CapabilityProvider.supportedCapabilities() must be implemented by subclasses");
    }

    /**
     * Initializes the provider when a new browser or page is spawned.
     * @param {string} browserId
     * @param {Object} page
     */
    async initialize(browserId, page) {
        // Optional override
    }

    /**
     * Instantly evaluates the current status of the capabilities.
     * @param {Object} syncContext { browserId, page, browserState, executionContext, deadline }
     * @returns {Promise<CapabilityResult>}
     */
    async currentStatus(syncContext) {
        throw new Error("CapabilityProvider.currentStatus() must be implemented by subclasses");
    }

    /**
     * Event-driven wait for the capabilities to become satisfied.
     * Must emit CapabilityPending, CapabilitySatisfied, or CapabilityLost.
     * @param {Object} syncContext { browserId, page, browserState, executionContext, deadline }
     * @returns {Promise<CapabilityResult>}
     */
    async waitFor(syncContext) {
        throw new Error("CapabilityProvider.waitFor() must be implemented by subclasses");
    }

    /**
     * Invalidates the current capabilities if conditions change (e.g., page navigated).
     * @param {Object} syncContext
     */
    async invalidate(syncContext) {
        throw new Error("CapabilityProvider.invalidate() must be implemented by subclasses");
    }
}
