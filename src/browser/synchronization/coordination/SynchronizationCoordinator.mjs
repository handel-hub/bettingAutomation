import { CapabilityDependencyGraph } from './CapabilityDependencyGraph.mjs';
import { SynchronizationSnapshot } from './SynchronizationSnapshot.mjs';
import { CapabilityRegistry } from '../CapabilityRegistry.mjs';
import { logger } from '../../../config.mjs';
import EventEmitter from 'node:events';

export class SynchronizationCoordinator extends EventEmitter {
    constructor(consistencyEvaluator, registry, cdpMutex = null) {
        super();
        this.evaluator = consistencyEvaluator;
        this.registry = registry;
        this.cdpMutex = cdpMutex;
        this.capabilityStates = new Map(); // browserId -> { [capability]: boolean }
    }

    initializeBrowser(browserId) {
        if (!this.capabilityStates.has(browserId)) {
            this.capabilityStates.set(browserId, {});
        }
    }

    handleCapabilityUpdate(browserId, capability, isReady) {
        if (this.cdpMutex && this.cdpMutex.locks.has(browserId)) {
            logger.debug(`[SynchronizationCoordinator] Suppressing capability update for [${browserId}] (${capability}=${isReady}) due to active CDP Mutex lock`);
            return;
        }

        this.initializeBrowser(browserId);
        const states = this.capabilityStates.get(browserId);
        
        const wasReady = states[capability] === true;
        states[capability] = isReady;

        // If it transitioned from Ready to Not Ready, invalidate dependencies
        if (wasReady && !isReady) {
            this._invalidateDependencies(browserId, capability);
        }

        const consistencyScore = this.evaluator.evaluate(states);
        
        this.registry.update(browserId, {
            consistencyState: {
                consistencyScore,
                lastEvaluated: Date.now(),
                policy: 'DEFAULT'
            }
        });

        this.emit('StateChanged', this.getSnapshot(browserId));
    }

    _invalidateDependencies(browserId, capability) {
        const dependents = CapabilityDependencyGraph.getDependentCapabilities(capability);
        const states = this.capabilityStates.get(browserId);
        
        for (const dep of dependents) {
            if (states[dep] === true) {
                states[dep] = false;

                this.emit('InvalidationRequested', {
                    browserId,
                    capability: dep,
                    cause: capability,
                    timestamp: Date.now()
                });

                this.emit('DependencyInvalidated', {
                    browserId,
                    cause: capability,
                    invalidated: dep,
                    timestamp: Date.now()
                });
            }
        }
    }

    getSnapshot(browserId) {
        this.initializeBrowser(browserId);
        const states = this.capabilityStates.get(browserId);
        const state = this.registry.getState(browserId) || {};
        
        return new SynchronizationSnapshot(
            browserId,
            state,
            { ...states },
            state.consistencyState ? state.consistencyState.consistencyScore : 0,
            state.recoveryState || {},
            state.synchronizationStatistics || {}
        );
    }
}
