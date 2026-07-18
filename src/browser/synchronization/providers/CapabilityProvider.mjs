/**
 * A pure interface representing an extension point for capability satisfaction.
 * Future stages (DOMProvider, ViewportProvider, etc.) will implement this.
 */
export class CapabilityProvider {
    /**
     * Declares whether this provider knows how to satisfy the given capability.
     * @param {string} capability 
     * @returns {boolean}
     */
    canSatisfy(capability) {
        throw new Error("Method 'canSatisfy()' must be implemented.");
    }

    /**
     * Attempts to satisfy the capability asynchronously.
     * @param {string} capability 
     * @param {string} browserId
     * @returns {Promise<boolean>} True if satisfied, false otherwise.
     */
    async satisfy(capability, browserId) {
        throw new Error("Method 'satisfy()' must be implemented.");
    }

    /**
     * Synchronously checks if the capability is currently satisfied.
     * @param {string} capability 
     * @param {string} browserId
     * @returns {boolean}
     */
    isSatisfied(capability, browserId) {
        throw new Error("Method 'isSatisfied()' must be implemented.");
    }
}
