import { CapabilityDependencyGraph } from './CapabilityDependencyGraph.mjs';
import { SynchronizationSnapshot } from './SynchronizationSnapshot.mjs';
import { BrowserStateRegistry } from '../BrowserStateRegistry.mjs';
import { CapabilityRegistry } from '../CapabilityRegistry.mjs';
import EventEmitter from 'node:events';

export class SynchronizationCoordinator extends EventEmitter {
    constructor(consistencyEvaluator) {
        super();
        this.evaluator = consistencyEvaluator;
        this.capabilityStates = new Map(); // browserId -> { [capability]: boolean }
    }

    initializeBrowser(browserId) {
        if (!this.capabilityStates.has(browserId)) {
            this.capabilityStates.set(browserId, {});
        }
    }

    handleCapabilityUpdate(browserId, capability, isReady) {
        this.initializeBrowser(browserId);
        const states = this.capabilityStates.get(browserId);
        
        const wasReady = states[capability] === true;
        states[capability] = isReady;

        // If it transitioned from Ready to Not Ready, invalidate dependencies
        if (wasReady && !isReady) {
            this._invalidateDependencies(browserId, capability);
        }

        const consistencyScore = this.evaluator.evaluate(states);
        
        BrowserStateRegistry.update(browserId, {
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
                
                // Update the state model natively
                BrowserStateRegistry.update(browserId, {
                    capabilities: { [dep]: false }
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
        const state = BrowserStateRegistry.getState(browserId) || {};
        
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
