import { TelemetryCollector } from '../execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';

export class SequenceGate {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Evaluates if a command can be executed based on GES.
     * @param {string} browserId 
     * @param {number} commandGes 
     * @returns {string} ALIGNED | WAITING | STALE
     */
    evaluate(browserId, commandGes) {
        if (commandGes === undefined || commandGes === null) {
            // Commands without GES bypass sequencing (e.g. out of band control)
            return 'ALIGNED';
        }

        const state = this.registry.getState(browserId);
        const slaveGes = state ? (state.currentGes || 0) : 0;
        
        if (commandGes === slaveGes + 1) {
            return 'ALIGNED';
        } else if (commandGes > slaveGes + 1) {
            return 'WAITING';
        } else {
            return 'STALE';
        }
    }

    /**
     * Asynchronously waits for a command to become ALIGNED.
     * @param {string} browserId 
     * @param {number} commandGes 
     * @param {number} timeoutMs 
     * @returns {Promise<object>} { status: 'ALIGNED' | 'STALE' | 'TIMEOUT' }
     */
    async evaluateAsync(browserId, commandGes, timeoutMs) {
        if (commandGes === undefined || commandGes === null) {
            return { status: 'ALIGNED' };
        }

        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const status = this.evaluate(browserId, commandGes);
            if (status === 'ALIGNED' || status === 'STALE') {
                return { status };
            }
            await new Promise(r => setTimeout(r, 50));
        }
        
        const finalStatus = this.evaluate(browserId, commandGes);
        if (finalStatus === 'WAITING') {
            const state = this.registry.getState(browserId);
            const slaveGes = state ? (state.currentGes || 0) : 0;
            TelemetryCollector.recordSyncGap(browserId, slaveGes + 1, commandGes);
            return { status: 'TIMEOUT' };
        }
        
        return { status: finalStatus };
    }
}
