import { TelemetryCollector } from '../execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';

export class SequenceGate {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Evaluates if a command can be executed based on MSN.
     * @param {string} browserId 
     * @param {number} commandMsn 
     * @returns {string} ALIGNED | WAITING | STALE
     */
    evaluate(browserId, commandMsn) {
        if (commandMsn === undefined || commandMsn === null) {
            // For commands without MSN, allow them
            return 'ALIGNED';
        }

        const state = this.registry.getState(browserId);
        const slaveMsn = state ? (state.currentMsn || 0) : 0;
        
        if (commandMsn === slaveMsn + 1) {
            return 'ALIGNED';
        } else if (commandMsn > slaveMsn + 1) {
            return 'WAITING';
        } else {
            return 'STALE';
        }
    }

    /**
     * Asynchronously waits for a command to become ALIGNED.
     * @param {string} browserId 
     * @param {number} commandMsn 
     * @param {number} timeoutMs 
     * @returns {Promise<object>} { status: 'ALIGNED' | 'STALE' | 'TIMEOUT' }
     */
    async evaluateAsync(browserId, commandMsn, timeoutMs) {
        if (commandMsn === undefined || commandMsn === null) {
            return { status: 'ALIGNED' };
        }

        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const status = this.evaluate(browserId, commandMsn);
            if (status === 'ALIGNED' || status === 'STALE') {
                return { status };
            }
            await new Promise(r => setTimeout(r, 50));
        }
        
        const finalStatus = this.evaluate(browserId, commandMsn);
        if (finalStatus === 'WAITING') {
            const state = this.registry.getState(browserId);
            const slaveMsn = state ? (state.currentMsn || 0) : 0;
            TelemetryCollector.recordSyncGap(browserId, slaveMsn + 1, commandMsn);
            return { status: 'TIMEOUT' };
        }
        
        return { status: finalStatus };
    }
}
