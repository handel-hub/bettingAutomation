import { BrowserStateRegistry } from './BrowserStateRegistry.mjs';
import { CapabilityRegistry } from './CapabilityRegistry.mjs';
import { logger } from '../../config.mjs';

/**
 * The orchestrator. Coordinates the barrier and executes Capability Providers.
 */
class SynchronizationManagerImpl {
    constructor() {
        this.coordinator = null;
        this.recoveryCoordinator = null;
        this.recoveryActionExecutor = null;
        this.telemetry = null;
        this.timeline = null;
        this.activeSyncContexts = new Map();
    }

    setCoordinator(coordinator) {
        this.coordinator = coordinator;
        this.coordinator.on('InvalidationRequested', async (event) => {
            const context = this.activeSyncContexts.get(event.browserId);
            if (context) {
                const provider = CapabilityRegistry.getProvider(event.capability);
                if (provider) {
                    await provider.invalidate(context);
                }
            }
        });
    }

    setRecoveryCoordinator(recoveryCoordinator) {
        this.recoveryCoordinator = recoveryCoordinator;
    }

    setRecoveryActionExecutor(executor) {
        this.recoveryActionExecutor = executor;
        this.recoveryActionExecutor.on('Command', (cmd) => {
            if (this.coordinator) this.coordinator.emit('Command', cmd);
        });
    }

    setTelemetry(telemetry) {
        this.telemetry = telemetry;
    }

    setTimeline(timeline) {
        this.timeline = timeline;
    }

    async awaitCapabilities(syncContext, capabilities) {
        this.activeSyncContexts.set(syncContext.browserId, syncContext);
        try {
            const providers = this.collectProviders(capabilities);
            const settledResults = await this.executeProviders(providers, syncContext);
            return this.aggregateResults(settledResults, capabilities, syncContext.browserId);
        } finally {
            this.activeSyncContexts.delete(syncContext.browserId);
        }
    }

    collectProviders(capabilities) {
        const uniqueProviders = new Set();
        for (const cap of capabilities) {
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
        return Promise.allSettled(promises);
    }

    aggregateResults(settledResults, requiredCapabilities, browserId) {
        const telemetryArray = [];
        const capabilityUpdates = {};

        for (const result of settledResults) {
            if (result.status === 'fulfilled') {
                const capResult = result.value;
                const isSatisfied = capResult.status === 'SATISFIED';
                const currentEpoch = BrowserStateRegistry.getState(browserId).navigationEpoch;
                capabilityUpdates[capResult.capability] = { 
                    value: isSatisfied, 
                    epoch: capResult.epoch !== undefined ? capResult.epoch : currentEpoch 
                };
                telemetryArray.push(capResult);
            } else {
                logger.error(`[SynchronizationManager] Provider threw an error: ${result.reason}`);
                telemetryArray.push({ status: 'FAILED', reason: result.reason?.message || 'Unknown error' });
            }
        }

        // Apply raw updates to capabilities
        if (Object.keys(capabilityUpdates).length > 0) {
            BrowserStateRegistry.update(browserId, { capabilities: capabilityUpdates });
        }

        // Pass to coordinator for cascading logic, snapshots, and consistency score updates
        if (this.coordinator) {
            for (const [cap, data] of Object.entries(capabilityUpdates)) {
                this.coordinator.handleCapabilityUpdate(browserId, cap, data.value);
            }
        }

        const snapshot = this.coordinator ? this.coordinator.getSnapshot(browserId) : null;
        const currentState = BrowserStateRegistry.getState(browserId);

        const missingCapabilities = [];
        for (const cap of requiredCapabilities) {
            // Note: If coordinator invalidated dependencies, this will reflect it natively
            if (!currentState.capabilities.isSatisfied(cap, currentState.navigationEpoch)) {
                missingCapabilities.push(cap);
            }
        }

        return {
            satisfied: missingCapabilities.length === 0,
            satisfiedCapabilities: requiredCapabilities.filter(c => currentState.capabilities.isSatisfied(c, currentState.navigationEpoch)),
            missingCapabilities: missingCapabilities,
            blockingCapability: missingCapabilities[0] || null,
            providerTelemetry: telemetryArray,
            snapshot: snapshot
        };
    }
}

export const SynchronizationManager = new SynchronizationManagerImpl();
