import { SynchronizationManager } from './SynchronizationManager.mjs';

/**
 * A completely stateless execution gate.
 */
export class SynchronizationBarrier {
    /**
     * Waits until the required synchronization profile is satisfied for the browser.
     * @param {Object} syncContext { browserId, page, browserState, context, deadline }
     * @returns {Promise<Object>} BarrierResult
     */
    static async wait(syncContext) {
        const { browserId, profile, context: executionContext, deadline } = syncContext;
        const capabilities = profile.level; // Array of required capabilities

        // Instantly satisfied?
        if (!capabilities || capabilities.length === 0) {
            return {
                status: 'PASSED',
                satisfiedCapabilities: [],
                missingCapabilities: [],
                blockingCapability: null,
                elapsed: 0,
                providerTelemetry: []
            };
        }

        const startTime = Date.now();
        executionContext.addTrace('BarrierWaitStarted');

        // Delegate to active providers
        const managerResult = await SynchronizationManager.awaitCapabilities(syncContext, capabilities);

        const elapsed = Date.now() - startTime;

        if (managerResult.satisfied) {
            executionContext.addTrace('BarrierSatisfied');
            return {
                status: 'PASSED',
                satisfiedCapabilities: managerResult.satisfiedCapabilities,
                missingCapabilities: [],
                blockingCapability: null,
                elapsed,
                providerTelemetry: managerResult.providerTelemetry
            };
        }

        if (Date.now() >= deadline) {
            executionContext.addTrace('BarrierTimeout');
            return {
                status: 'TIMEOUT',
                satisfiedCapabilities: managerResult.satisfiedCapabilities,
                missingCapabilities: managerResult.missingCapabilities,
                blockingCapability: managerResult.blockingCapability,
                elapsed,
                providerTelemetry: managerResult.providerTelemetry
            };
        }

        executionContext.addTrace('BarrierFailed');
        return {
            status: 'FAILED',
            satisfiedCapabilities: managerResult.satisfiedCapabilities,
            missingCapabilities: managerResult.missingCapabilities,
            blockingCapability: managerResult.blockingCapability,
            elapsed,
            providerTelemetry: managerResult.providerTelemetry
        };
    }
}
