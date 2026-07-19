/**
 * Registry connecting Synchronization Capabilities to their respective Providers.
 */
class CapabilityRegistryImpl {
    constructor() {
        this.providers = new Map();
    }

    /**
     * Registers a provider for all the capabilities it supports.
     * @param {CapabilityProvider} provider 
     */
    registerProvider(provider) {
        const caps = provider.supportedCapabilities();
        for (const cap of caps) {
            this.providers.set(cap, provider);
        }
    }

    /**
     * Retrieves the provider responsible for a specific capability.
     * @param {string} capability 
     * @returns {CapabilityProvider | null}
     */
    getProvider(capability) {
        return this.providers.get(capability) || null;
    }

    /**
     * Initializes all registered providers for a given page.
     * @param {string} browserId
     * @param {Object} page
     */
    async initializeAll(browserId, page) {
        // Collect unique providers (since a provider might support multiple capabilities)
        const uniqueProviders = new Set(this.providers.values());
        for (const provider of uniqueProviders) {
            await provider.initialize(browserId, page);
        }
    }
}

export const CapabilityRegistry = new CapabilityRegistryImpl();
