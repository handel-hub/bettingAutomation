import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import EventEmitter from 'node:events';

export class EpochGate extends EventEmitter {
    constructor() {
        super();
        this.epochs = new Map(); // browserId -> { value, url, timestamp }
        this.gatedStates = new Map(); // browserId -> { targetEpoch, gatedSince }
    }

    incrementEpoch(browserId, url = '', timestamp = Date.now()) {
        const current = this.getCurrentEpoch(browserId);
        const nextValue = current + 1;
        this.epochs.set(browserId, {
            value: nextValue,
            url,
            timestamp
        });
        if (this.gatedStates.has(browserId) && nextValue >= this.gatedStates.get(browserId).targetEpoch) {
            this.gatedStates.delete(browserId);
        }
        this.emit('EpochChanged', { browserId, epoch: nextValue, url });
        this.emit('ACK_epoch', { browserId, epoch: nextValue, url });
        return nextValue;
    }

    getCurrentEpoch(browserId) {
        const record = this.epochs.get(browserId);
        return record ? record.value : 0;
    }

    getEpochRecord(browserId) {
        return this.epochs.get(browserId) || { value: 0, url: '', timestamp: 0 };
    }

    isGated(browserId) {
        return this.gatedStates.has(browserId);
    }

    onPhysicalNavComplete(browserId, epoch, url = '', page = null) {
        this.epochs.set(browserId, {
            value: epoch,
            url,
            timestamp: Date.now()
        });
        if (this.gatedStates.has(browserId) && epoch >= this.gatedStates.get(browserId).targetEpoch) {
            this.gatedStates.delete(browserId);
        }
        this.emit('EpochChanged', { browserId, epoch, url });
        this.emit('ACK_epoch', { browserId, epoch, url });
        return { decision: 'PROCEED', action: 'UNLOCK_EXECUTION', epoch, url };
    }

    ingestEpochBarrier(browserId, epoch, url = '') {
        return this.onPhysicalNavComplete(browserId, epoch, url);
    }

    evaluate(browserId, commandEpoch) {
        if (!featureFlags.isEnabled('LI_EPOCH_GATING')) {
            return { decision: 'PROCEED', action: 'UNLOCK_EXECUTION', reason: 'Epoch gating disabled' };
        }

        if (!commandEpoch || commandEpoch === 0) {
            return { decision: 'PROCEED', action: 'UNLOCK_EXECUTION', reason: 'Legacy command or unknown epoch (0)' };
        }

        const slaveEpoch = this.getCurrentEpoch(browserId);

        if (commandEpoch === slaveEpoch) {
            const decision = { decision: 'PROCEED', action: 'UNLOCK_EXECUTION', reason: `Epochs match (${commandEpoch})` };
            try { TelemetryCollector.recordEpochDecision(decision, 0, decision.reason); } catch (e) {}
            return decision;
        }

        if (commandEpoch < slaveEpoch) {
            const decision = { decision: 'SKIP', action: 'PURGE_STALE', errorCode: 'LF-604', reason: `Command epoch ${commandEpoch} is behind slave epoch ${slaveEpoch}` };
            try {
                TelemetryCollector.recordEpochMismatch(commandEpoch, slaveEpoch);
                TelemetryCollector.recordEpochDecision(decision, 0, decision.reason);
            } catch (e) {}
            return decision;
        }

        if (!this.gatedStates.has(browserId)) {
            this.gatedStates.set(browserId, { targetEpoch: commandEpoch, gatedSince: Date.now() });
            this.emit('EPOCH_GATED', { browserId, currentEpoch: slaveEpoch, targetEpoch: commandEpoch });
        }
        const decision = { decision: 'WAIT', action: 'BUFFER_COMMAND', reason: `Command epoch ${commandEpoch} is ahead of slave epoch ${slaveEpoch}` };
        try {
            TelemetryCollector.recordEpochMismatch(commandEpoch, slaveEpoch);
            TelemetryCollector.recordEpochDecision(decision, 0, decision.reason);
        } catch (e) {}
        return decision;
    }

    async waitForEpochAlignment(browserId, commandEpoch, timeoutMs = 5000, pollIntervalMs = 50) {
        const startTime = Date.now();
        return new Promise(resolve => {
            let resolved = false;
            const check = () => {
                if (resolved) return;
                const current = this.getCurrentEpoch(browserId);
                if (current === commandEpoch) {
                    resolved = true;
                    cleanup();
                    const elapsed = Date.now() - startTime;
                    const decision = { decision: 'PROCEED', action: 'UNLOCK_EXECUTION', reason: `Epoch aligned (${commandEpoch}) after waiting` };
                    try { TelemetryCollector.recordEpochDecision(decision, elapsed, decision.reason); } catch (e) {}
                    resolve(decision);
                    return true;
                }
                if (current > commandEpoch) {
                    resolved = true;
                    cleanup();
                    const elapsed = Date.now() - startTime;
                    const decision = { decision: 'SKIP', action: 'PURGE_STALE', errorCode: 'LF-604', reason: `Slave navigated past command epoch (${current} > ${commandEpoch})` };
                    try { TelemetryCollector.recordEpochDecision(decision, elapsed, decision.reason); } catch (e) {}
                    resolve(decision);
                    return true;
                }
                if (Date.now() - startTime >= timeoutMs) {
                    resolved = true;
                    cleanup();
                    const elapsed = Date.now() - startTime;
                    const decision = { decision: 'SKIP', action: 'PURGE_STALE', errorCode: 'LF-604', reason: `Slave failed to navigate within ${timeoutMs}ms` };
                    try { TelemetryCollector.recordEpochDecision(decision, elapsed, decision.reason); } catch (e) {}
                    resolve(decision);
                    return true;
                }
                return false;
            };
            const onEpoch = ({ browserId: id }) => {
                if (id === browserId) check();
            };
            this.on('EpochChanged', onEpoch);
            this.on('ACK_epoch', onEpoch);
            const timer = setInterval(() => check(), pollIntervalMs);
            if (timer && typeof timer.unref === 'function') timer.unref();
            const cleanup = () => {
                clearInterval(timer);
                this.off('EpochChanged', onEpoch);
                this.off('ACK_epoch', onEpoch);
            };
            // Immediate check
            check();
        });
    }

    async evaluateAsync(browserId, commandEpoch, timeoutMs = 5000) {
        const initial = this.evaluate(browserId, commandEpoch);
        if (initial.decision !== 'WAIT') {
            return initial;
        }
        return this.waitForEpochAlignment(browserId, commandEpoch, timeoutMs);
    }
}
export default EpochGate;

