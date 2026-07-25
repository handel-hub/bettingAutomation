import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class EpochGate {
    constructor() {
        this.epochs = new Map(); // browserId -> { value, url, timestamp }
    }

    incrementEpoch(browserId, url = '', timestamp = Date.now()) {
        const current = this.getCurrentEpoch(browserId);
        const nextValue = current + 1;
        this.epochs.set(browserId, {
            value: nextValue,
            url,
            timestamp
        });
        return nextValue;
    }

    getCurrentEpoch(browserId) {
        const record = this.epochs.get(browserId);
        return record ? record.value : 0;
    }

    getEpochRecord(browserId) {
        return this.epochs.get(browserId) || { value: 0, url: '', timestamp: 0 };
    }

    evaluate(browserId, commandEpoch) {
        if (!featureFlags.isEnabled('LI_EPOCH_GATING')) {
            return { decision: 'PROCEED', reason: 'Epoch gating disabled' };
        }

        if (!commandEpoch || commandEpoch === 0) {
            return { decision: 'PROCEED', reason: 'Legacy command or unknown epoch (0)' };
        }

        const slaveEpoch = this.getCurrentEpoch(browserId);

        if (commandEpoch === slaveEpoch) {
            const decision = { decision: 'PROCEED', reason: `Epochs match (${commandEpoch})` };
            try { TelemetryCollector.recordEpochDecision(decision, 0, decision.reason); } catch (e) {}
            return decision;
        }

        if (commandEpoch < slaveEpoch) {
            const decision = { decision: 'SKIP', reason: `Command epoch ${commandEpoch} is behind slave epoch ${slaveEpoch}` };
            try {
                TelemetryCollector.recordEpochMismatch(commandEpoch, slaveEpoch);
                TelemetryCollector.recordEpochDecision(decision, 0, decision.reason);
            } catch (e) {}
            return decision;
        }

        const decision = { decision: 'WAIT', reason: `Command epoch ${commandEpoch} is ahead of slave epoch ${slaveEpoch}` };
        try {
            TelemetryCollector.recordEpochMismatch(commandEpoch, slaveEpoch);
            TelemetryCollector.recordEpochDecision(decision, 0, decision.reason);
        } catch (e) {}
        return decision;
    }

    async waitForEpochAlignment(browserId, commandEpoch, timeoutMs = 2000, pollIntervalMs = 100) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            
            const current = this.getCurrentEpoch(browserId);
            if (current === commandEpoch) {
                const elapsed = Date.now() - startTime;
                const decision = { decision: 'PROCEED', reason: `Epoch aligned (${commandEpoch}) after waiting` };
                try { TelemetryCollector.recordEpochDecision(decision, elapsed, decision.reason); } catch (e) {}
                return decision;
            }
            if (current > commandEpoch) {
                const elapsed = Date.now() - startTime;
                const decision = { decision: 'SKIP', reason: `Slave navigated past command epoch (${current} > ${commandEpoch})` };
                try { TelemetryCollector.recordEpochDecision(decision, elapsed, decision.reason); } catch (e) {}
                return decision;
            }
        }

        const elapsed = Date.now() - startTime;
        const decision = { decision: 'SKIP', reason: `Slave failed to navigate within ${timeoutMs}ms` };
        try { TelemetryCollector.recordEpochDecision(decision, elapsed, decision.reason); } catch (e) {}
        return decision;
    }

    async evaluateAsync(browserId, commandEpoch, timeoutMs = 2000) {
        const initial = this.evaluate(browserId, commandEpoch);
        if (initial.decision !== 'WAIT') {
            return initial;
        }
        return this.waitForEpochAlignment(browserId, commandEpoch, timeoutMs);
    }
}
export default EpochGate;
