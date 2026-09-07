import { TelemetryCollector } from '../execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';

export class SequenceGate {
    constructor(registry) {
        this.registry = registry;
        this.watchdogs = new Map(); // browserId -> timeoutId
        
        if (this.registry) {
            const clearForBrowser = (event) => {
                const browserId = event.browserId || event.id;
                if (browserId) this.cancelWatchdog(browserId);
            };
            this.registry.on('WORKER_FAILOVER', clearForBrowser);
            this.registry.on('WORKER_BROKEN', clearForBrowser);
        }
    }

    evaluate(browserId, commandGes) {
        if (commandGes === undefined || commandGes === null) {
            import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
                forensicLogger.log('GES_VALIDATE', { accountId: browserId, browserId, previousGES: null, newGES: null, result: 'ALIGNED', reason: 'No GES provided' });
            }).catch(()=>{});
            return 'ALIGNED';
        }

        const state = this.registry.getState(browserId);
        const slaveGes = state ? (state.currentGes || 0) : 0;
        
        let result = 'STALE';
        if (commandGes === slaveGes + 1) result = 'ALIGNED';
        else if (commandGes > slaveGes + 1) result = 'WAITING';

        import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
            forensicLogger.log('GES_VALIDATE', { accountId: browserId, browserId, previousGES: slaveGes, newGES: commandGes, result });
        }).catch(()=>{});

        return result;
    }

    startWatchdog(browserId, targetGes, timeoutMs, onTimeout, commandContext = null) {
        this.cancelWatchdog(browserId);
        
        if (commandContext) {
            import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                observabilityCollector.emitTransition({
                    commandId: commandContext.commandId,
                    traceId: commandContext.traceId,
                    prevState: 'ASSIGNED',
                    newState: 'WAITING_GES',
                    eventName: 'SEQUENCE_GATE_ENTERED',
                    owner: 'SequenceGate',
                    browserId: browserId,
                    metadata: { expectedGes: targetGes }
                });
            }).catch(() => {});
        }

        const timeoutId = setTimeout(() => {
            this.watchdogs.delete(browserId);
            
            if (commandContext) {
                import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: commandContext.commandId,
                        traceId: commandContext.traceId,
                        prevState: 'WAITING_GES',
                        newState: 'SEQUENCE_TIMEOUT',
                        eventName: 'SEQUENCE_GATE_TIMEOUT',
                        owner: 'SequenceGate',
                        browserId: browserId
                    });
                }).catch(() => {});
            }

            if (onTimeout) onTimeout();
        }, timeoutMs);
        
        this.watchdogs.set(browserId, timeoutId);
    }
    
    cancelWatchdog(browserId, commandContext = null) {
        if (this.watchdogs.has(browserId)) {
            clearTimeout(this.watchdogs.get(browserId));
            this.watchdogs.delete(browserId);
            
            if (commandContext) {
                import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: commandContext.commandId,
                        traceId: commandContext.traceId,
                        prevState: 'WAITING_GES',
                        newState: 'SEQUENCE_PASSED',
                        eventName: 'SEQUENCE_GATE_RELEASED',
                        owner: 'SequenceGate',
                        browserId: browserId
                    });
                }).catch(() => {});
            }
        }
    }
}
