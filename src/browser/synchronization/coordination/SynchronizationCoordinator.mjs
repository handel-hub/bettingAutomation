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
        this.pendingUpdates = new WeakMap(); // stateModel -> Map<capability, isReady>
        
        if (this.cdpMutex) {
            this.cdpMutex.on('RecoveryLockReleased', ({ browserId }) => {
                const stateModel = this.registry.getState(browserId);
                if (!stateModel) return;
                
                const pending = this.pendingUpdates.get(stateModel);
                if (pending && pending.size > 0) {
                    logger.debug(`[SynchronizationCoordinator] Draining ${pending.size} pending capability updates for [${browserId}] post-mutex release`);
                    const updatesToApply = Array.from(pending.entries());
                    pending.clear();
                    
                    for (const [capability, isReady] of updatesToApply) {
                        this.handleCapabilityUpdate(browserId, capability, isReady);
                    }
                }
            });
        }
    }

    initializeBrowser(browserId) {
        if (!this.capabilityStates.has(browserId)) {
            this.capabilityStates.set(browserId, {});
        }
    }

    handleCapabilityUpdate(browserId, capability, isReady) {
        if (this.cdpMutex && this.cdpMutex.locks.has(browserId)) {
            logger.debug(`[SynchronizationCoordinator] Suppressing capability update for [${browserId}] (${capability}=${isReady}) due to active CDP Mutex lock`);
            const stateModel = this.registry.getState(browserId);
            if (stateModel) {
                let pending = this.pendingUpdates.get(stateModel);
                if (!pending) {
                    pending = new Map();
                    this.pendingUpdates.set(stateModel, pending);
                }
                pending.set(capability, isReady);
            }
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
