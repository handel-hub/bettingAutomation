import { BrowserStateRegistry } from './BrowserStateRegistry.mjs';
import { CapabilityRegistry } from './CapabilityRegistry.mjs';
import { logger } from '../../config.mjs';

/**
 * The orchestrator. Coordinates the barrier and executes Capability Providers.
 */
class SynchronizationManagerImpl {
    /**
     * Waits for the specified capabilities to be satisfied by actively polling providers.
     * @param {Object} syncContext { browserId, page, browserState, executionContext, deadline }
     * @param {string[]} capabilities 
     * @returns {Promise<Object>}
     */
    async awaitCapabilities(syncContext, capabilities) {
        const providers = this.collectProviders(capabilities);
        const settledResults = await this.executeProviders(providers, syncContext);
        return this.aggregateResults(settledResults, capabilities, syncContext.browserId);
    }

    collectProviders(capabilities) {
        const uniqueProviders = new Set();
        for (const cap of capabilities) {
            // Note: In Stage 2.3 we only have DOMProvider. We don't have a CONNECTED or NAVIGATION provider yet.
            // If there's no provider, we skip.
            const provider = CapabilityRegistry.getProvider(cap);
            if (provider) {
                uniqueProviders.add(provider);
            }
        }
        return Array.from(uniqueProviders);
    }

    async executeProviders(providers, syncContext) {
        if (providers.length === 0) return [];
        const promises = providers.map(p => p.waitFor(syncContext));
        // Use allSettled so one failure doesn't abort telemetry collection for the rest
        return Promise.allSettled(promises);
    }

    aggregateResults(settledResults, requiredCapabilities, browserId) {
        const capabilityUpdates = {};
        const telemetryArray = [];
        const satisfiedCaps = new Set();

        for (const result of settledResults) {
            if (result.status === 'fulfilled') {
                const capResult = result.value;
                if (capResult.status === 'SATISFIED') {
                    satisfiedCaps.add(capResult.capability);
                    capabilityUpdates[capResult.capability] = true;
                }
                telemetryArray.push(capResult);
            } else {
                logger.error(`[SynchronizationManager] Provider threw an error: ${result.reason}`);
                telemetryArray.push({ status: 'FAILED', reason: result.reason?.message || 'Unknown error' });
            }
        }

        // The manager safely applies capability mutations to the registry
        if (Object.keys(capabilityUpdates).length > 0) {
            BrowserStateRegistry.update(browserId, { capabilities: capabilityUpdates });
        }

        const missingCapabilities = [];
        const currentState = BrowserStateRegistry.getState(browserId);

        for (const cap of requiredCapabilities) {
            if (!currentState.capabilities.isSatisfied(cap)) {
                missingCapabilities.push(cap);
            }
        }

        return {
            satisfied: missingCapabilities.length === 0,
            satisfiedCapabilities: Array.from(satisfiedCaps),
            missingCapabilities: missingCapabilities,
            blockingCapability: missingCapabilities[0] || null,
            providerTelemetry: telemetryArray
        };
    }
}

export const SynchronizationManager = new SynchronizationManagerImpl();
