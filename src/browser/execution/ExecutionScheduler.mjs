import { logger } from '../../config.mjs';
import { Command } from './Command.mjs';
import { ExecutionContext } from './ExecutionContext.mjs';
import { SynchronizationProfiles } from '../synchronization/profiles/SynchronizationProfiles.mjs';
import { SynchronizationBarrier } from '../synchronization/SynchronizationBarrier.mjs';
import { SequenceGate } from '../synchronization/SequenceGate.mjs';
import { DeadlineBudget } from './time/DeadlineBudget.mjs';
import { QueueDeadlineExceededError } from './errors.mjs';
import { SequenceGapError, StaleCommandError } from '../../common/errors/ProtocolErrors.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';

let _cachedCollector = null;
async function getCollector() {
    if (!_cachedCollector) {
        const mod = await import('../telemetry/ObservabilityCollector.mjs');
        _cachedCollector = mod.observabilityCollector;
    }
    return _cachedCollector;
}


export class ClassificationPolicy {
    static classify(command) {
        if (!command || !command.type) return { class: 'Discrete', priority: 'High' };
        
        // Immutable Priority Enforcement:
        // The scheduler strictly honors the pre-assigned priority class.
        // It does not infer or inspect metadata.intent.
        if (command.priority === 'CRITICAL') {
            return { class: 'Critical', priority: 'Critical' };
        }
        if (command.priority === 'DISCRETE') {
            return { class: 'Discrete', priority: 'High' };
        }
        if (command.priority === 'CONTINUOUS') {
            return { class: 'Continuous', priority: 'Low' };
        }
        if (command.priority === 'AGGREGATED') {
            return { class: 'Aggregated', priority: 'Medium' };
        }

        const t = command.type.toLowerCase();
        
        // Critical overrides (fallback for improperly wrapped commands)
        if (command.category === 'Recovery' || command.category === 'Navigation') {
             return { class: 'Critical', priority: 'Critical' };
        }
        
        if (t === 'hover' || t === 'mousemove' || t === 'pointermove') {
            return { class: 'Continuous', priority: 'Low' };
        }
        if (t === 'scroll' || t === 'wheel' || t === 'window_scroll' || t === 'element_scroll') {
            return { class: 'Aggregated', priority: 'Medium' };
        }
        // CLICK, DOUBLE_CLICK, DRAG, INPUT, KEYBOARD, navigate, etc.
        return { class: 'Discrete', priority: 'High' };
    }
}

export class SchedulingPolicy {
    static apply(queueBucket, queueClass, entry) {
        let dropped = [];
        if (queueClass === 'Discrete' || queueClass === 'Critical') {
            queueBucket.push(entry);
            entry.schedulerDecision = 'Enqueued FIFO';
        } else if (queueClass === 'Continuous') {
            const existed = queueBucket.length > 0;
            if (existed) {
                dropped.push(queueBucket[0]);
            }
            queueBucket[0] = entry; // Latest State
            entry.schedulerDecision = existed ? 'Overwrote Pending' : 'Enqueued Latest';
        } else if (queueClass === 'Aggregated') {
            if (queueBucket.length === 0) {
                queueBucket.push(entry);
                entry.schedulerDecision = 'Enqueued Aggregated';
            } else {
                const existing = queueBucket[0];
                // Coalesce mathematics
                if (entry.command.type === 'SCROLL' || entry.command.type === 'wheel') {
                    if (existing.command.payload && entry.command.payload) {
                        const edx = existing.command.payload.deltas ? existing.command.payload.deltas.deltaX : (existing.command.payload.deltaX || 0);
                        const edy = existing.command.payload.deltas ? existing.command.payload.deltas.deltaY : (existing.command.payload.deltaY || 0);
                        const ndx = entry.command.payload.deltas ? entry.command.payload.deltas.deltaX : (entry.command.payload.deltaX || 0);
                        const ndy = entry.command.payload.deltas ? entry.command.payload.deltas.deltaY : (entry.command.payload.deltaY || 0);
                        
                        // Create a brand new Command to bypass deepFreeze immutability
                        existing.command = new Command({
                            category: existing.command.category,
                            type: existing.command.type,
                            target: existing.command.target,
                            source: existing.command.source,
                            executionMode: existing.command.executionMode,
                            metadata: entry.command.metadata,
                            version: existing.command.version,
                            lifecycle: existing.command.lifecycle,
                            id: existing.command.id,
                            captureTime: existing.command.captureTime,
                            creationTime: existing.command.creationTime,
                            payload: {
                               ...entry.command.payload,
                               deltas: { deltaX: edx + ndx, deltaY: edy + ndy }
                            },
                            ges: existing.command.ges
                        });
                        entry.schedulerDecision = 'Coalesced Payload';
                        dropped.push(entry);
                    }
                } else {
                    dropped.push(existing);
                    // Absolute target overwrite for window_scroll/element_scroll 
                    queueBucket[0] = entry;
                    entry.schedulerDecision = 'Overwrote Pending Scroll';
                }
            }
        }
        return dropped;
    }
}

export class QueueManager {
    constructor() {
        this.buckets = {
            Critical: [],
            Discrete: [],
            Aggregated: [],
            Continuous: []
        };
        this.stats = {
            droppedHovers: 0,
            coalescedScrolls: 0
        };
    }

    insert(queueClass, entry) {
        const realDiscreteCount = this.buckets.Discrete.filter(e => e.command.type !== 'NOOP').length;
        if (queueClass === 'Discrete' && realDiscreteCount >= 100) {
            throw new Error('Queue Limit Exceeded: Discrete Queue overflowed (max 100). FATAL_DESYNC.');
        }
        const dropped = SchedulingPolicy.apply(this.buckets[queueClass], queueClass, entry);
        
        let sortRequired = false;
        for (const drop of dropped) {
            if (drop.command && drop.command.ges !== undefined && drop.command.ges !== null) {
                this.buckets.Discrete.push({
                    command: new Command({
                        category: 'Execution',
                        type: 'NOOP',
                        ges: drop.command.ges,
                        captureTime: drop.command.captureTime,
                        metadata: { reason: 'Skipped due to coalesce/overwrite' }
                    }),
                    enqueueTime: Date.now(),
                    queueClass: 'Discrete',
                    priority: 'High',
                    dequeueTime: null,
                    queueDelay: 0,
                    schedulerDecision: 'NOOP Gap Filler'
                });
                sortRequired = true;
            }
        }

        if (sortRequired) {
            this.buckets.Discrete.sort((a, b) => (a.command.ges ?? 0) - (b.command.ges ?? 0));
        }

        if (entry.schedulerDecision && entry.schedulerDecision.includes('Overwrote')) {
            this.stats.droppedHovers += dropped.length;
        }
        if (entry.schedulerDecision && entry.schedulerDecision.includes('Coalesced')) {
            this.stats.coalescedScrolls += dropped.length;
        }
    }

    peekNext() {
        const order = ['Critical', 'Discrete', 'Aggregated', 'Continuous'];
        const candidates = [];
        for (const qClass of order) {
            if (this.buckets[qClass].length > 0) {
                candidates.push({ queueClass: qClass, entry: this.buckets[qClass][0] });
            }
        }

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            const aGes = a.entry.command.ges;
            const bGes = b.entry.command.ges;
            const aHasGes = aGes !== undefined && aGes !== null;
            const bHasGes = bGes !== undefined && bGes !== null;
            if (!aHasGes && bHasGes) return -1;
            if (aHasGes && !bHasGes) return 1;
            if (!aHasGes && !bHasGes) return order.indexOf(a.queueClass) - order.indexOf(b.queueClass);
            return aGes - bGes;
        });

        return candidates[0].entry;
    }

    dequeueNext() {
        const order = ['Critical', 'Discrete', 'Aggregated', 'Continuous'];
        
        let candidates = [];
        for (const queueClass of order) {
            if (this.buckets[queueClass].length > 0) {
                candidates.push({ queueClass, entry: this.buckets[queueClass][0] });
            }
        }

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            const aGes = a.entry.command.ges;
            const bGes = b.entry.command.ges;

            const aHasGes = aGes !== undefined && aGes !== null;
            const bHasGes = bGes !== undefined && bGes !== null;

            if (!aHasGes && bHasGes) return -1;
            if (aHasGes && !bHasGes) return 1;

            if (!aHasGes && !bHasGes) {
                return order.indexOf(a.queueClass) - order.indexOf(b.queueClass);
            }

            return aGes - bGes;
        });

        const selected = candidates[0];
        this.buckets[selected.queueClass].shift();
        return selected.entry;
    }

    clear() {
        this.buckets = { Critical: [], Discrete: [], Aggregated: [], Continuous: [] };
    }
    
    handleNavigation() {
        const dropped = [
            ...this.buckets.Continuous,
            ...this.buckets.Aggregated,
            ...this.buckets.Discrete.filter(entry => 
                !(entry.command.type === 'navigate' || entry.command.type === 'CLICK' || entry.command.category === 'Navigation')
            )
        ];

        this.buckets.Continuous = [];
        this.buckets.Aggregated = [];
        this.buckets.Discrete = this.buckets.Discrete.filter(entry => 
            entry.command.type === 'navigate' || entry.command.type === 'CLICK' || entry.command.category === 'Navigation'
        );

        for (const drop of dropped) {
            if (drop.command && drop.command.ges !== undefined && drop.command.ges !== null) {
                this.buckets.Discrete.push({
                    command: new Command({
                        category: 'Execution',
                        type: 'NOOP',
                        ges: drop.command.ges,
                        captureTime: drop.command.captureTime,
                        metadata: { reason: 'Skipped due to navigation queue purge' }
                    }),
                    enqueueTime: Date.now(),
                    queueClass: 'Discrete',
                    priority: 'High',
                    dequeueTime: null,
                    queueDelay: 0,
                    schedulerDecision: 'NOOP Gap Filler (Nav)'
                });
            }
        }
    }

    applyBackpressure() {
        const dropped = [...this.buckets.Continuous, ...this.buckets.Aggregated];
        this.buckets.Continuous = [];
        this.buckets.Aggregated = [];
        let sortRequired = false;
        
        for (const drop of dropped) {
            if (drop.command && drop.command.ges !== undefined && drop.command.ges !== null) {
                this.buckets.Discrete.push({
                    command: new Command({
                        category: 'Execution',
                        type: 'NOOP',
                        ges: drop.command.ges,
                        captureTime: drop.command.captureTime,
                        metadata: { reason: 'Skipped due to applyBackpressure' }
                    }),
                    enqueueTime: Date.now(),
                    queueClass: 'Discrete',
                    priority: 'High',
                    dequeueTime: null,
                    queueDelay: 0,
                    schedulerDecision: 'NOOP Gap Filler'
                });
                sortRequired = true;
            }
        }
        
        if (sortRequired) {
            this.buckets.Discrete.sort((a, b) => (a.command.ges ?? 0) - (b.command.ges ?? 0));
        }
    }
}

export class ExecutionScheduler {
    constructor(actionSimulator, registry, syncManager, sequenceGate = null) {
        this.simulator = actionSimulator;
        this.registry = registry;
        this.syncManager = syncManager;
        this.sequenceGate = sequenceGate || new SequenceGate(registry);
        if (this.simulator) {
            this.simulator.registry = this.registry;
        }
        
        if (this.registry) {
            this.registry.on('WORKER_FAILOVER', ({ browserId }) => {
                logger.info(`[ExecutionScheduler] Clearing queue for [${browserId}] due to WORKER_FAILOVER to prevent stale execution`);
                this.clearQueue(browserId);
            });
        }
        
        this.browserQueues = new Map();
        this.drainLocks = new Set();
        this.backpressureActive = false;
        this.browserBackpressure = new Set();
        this.telemetry = {
            totalEnqueued: 0,
            totalDequeued: 0,
            cumulativeQueueWait: 0,
            maxQueueWait: 0,
        };
        
        this.telemetryIntervalId = setInterval(() => this.logTelemetry(), 10000);
    }

    setBackpressure(browserId, active) {
        if (browserId === 'global' || !browserId) {
            this.backpressureActive = active;
            if (active) {
                for (const qManager of this.browserQueues.values()) {
                    qManager.applyBackpressure();
                }
            }
        } else {
            if (active) {
                this.browserBackpressure.add(browserId);
                const qManager = this.browserQueues.get(browserId);
                if (qManager) qManager.applyBackpressure();
            } else {
                this.browserBackpressure.delete(browserId);
            }
        }
    }

    isBackpressureActive(browserId) {
        return this.backpressureActive || (browserId && this.browserBackpressure.has(browserId));
    }

    dispose() {
        if (this.telemetryIntervalId) {
            clearInterval(this.telemetryIntervalId);
            this.telemetryIntervalId = null;
        }
        this.browserQueues.clear();
        this.drainLocks.clear();
        this.browserBackpressure.clear();
    }

    enqueue(browserObj, command) {
        const browserId = browserObj.id;
        if (!this.browserQueues.has(browserId)) {
            this.browserQueues.set(browserId, new QueueManager());
        }

        const qManager = this.browserQueues.get(browserId);
        
        const { class: queueClass, priority } = ClassificationPolicy.classify(command);
        if (this.isBackpressureActive(browserId) && (queueClass === 'Continuous' || queueClass === 'Aggregated')) {
            logger.debug(`[ExecutionScheduler] Backpressure active on [${browserId}]: converting ${queueClass} command ${command.type} to NOOP`);
            getCollector().then((observabilityCollector) => {
                observabilityCollector.emitTransition({
                    commandId: command.id || command.commandId,
                    traceId: command.traceId || null,
                    interactionId: command.interactionId || null,
                    prevState: 'ROUTED',
                    newState: 'EVICTED',
                    eventName: 'COMMAND_EVICTED',
                    owner: 'ExecutionScheduler',
                    browserId: browserId,
                    metadata: { reason: 'Backpressure enqueue drop' }
                });
            }).catch(() => {});
            
            const noopEntry = {
                command: new Command({
                    category: 'Execution', type: 'NOOP', ges: command.ges, captureTime: command.captureTime,
                    metadata: { reason: 'Backpressure enqueue drop' }
                }),
                enqueueTime: Date.now(), queueClass: 'Discrete', priority: 'High', dequeueTime: null, queueDelay: 0,
                schedulerDecision: 'NOOP Gap Filler (Backpressure)'
            };
            qManager.buckets.Discrete.push(noopEntry);
            qManager.buckets.Discrete.sort((a, b) => (a.command.ges ?? 0) - (b.command.ges ?? 0));
            return;
        }
        
        const entry = {
            command: command,
            enqueueTime: Date.now(),
            queueClass: queueClass,
            priority: priority,
            dequeueTime: null,
            queueDelay: 0,
            schedulerDecision: null
        };



        try {
            qManager.insert(queueClass, entry);
            this.telemetry.totalEnqueued++;
            const eid = command.payload && command.payload.identityDocument ? command.payload.identityDocument : null;
            TelemetryCollector.recordLifecycleEvent({
                traceId: command.traceId || command.payload?.traceId || 'tr-unknown',
                spanId: 'sp-09-' + browserId.slice(0, 4),
                parentSpanId: 'sp-03',
                stageSequence: 9,
                stageName: 'QUEUE_ENQUEUE',
                component: 'ExecutionScheduler.mjs',
                method: 'enqueue',
                timestamp: Date.now(),
                browserId,
                interactionId: command.payload?.interactionId || 'ia-unknown',
                commandId: command.id,
                interactionType: command.type,
                eidPresent: !!eid,
                eidHash: command.eidHash || TelemetryCollector.computeEIDHash(eid)
            });

            getCollector().then((observabilityCollector) => {
                observabilityCollector.emitTransition({
                    commandId: command.id || command.commandId,
                    traceId: command.traceId || null,
                    interactionId: command.interactionId || null,
                    prevState: 'ROUTED',
                    newState: 'ENQUEUED',
                    eventName: 'COMMAND_ENQUEUED',
                    owner: 'ExecutionScheduler',
                    browserId: browserId,
                    metadata: { queueClass, priority, ges: command.ges }
                });
            }).catch(() => {});

        } catch (err) {
            if (err.message.includes('Queue Limit Exceeded')) {
                this.registry.emit('WORKER_BROKEN', { id: browserId, error: err });
            }
            logger.fatal(`[ExecutionScheduler] ${err.message} on slave [${browserId}]`);
            this.simulator.emit('ActionFailure', { id: browserId, command, error: err });
            return;
        }

        this._drain(browserObj).catch(err => {
            logger.error(`[ExecutionScheduler] Unhandled drain error on [${browserId}]: ${err.message}`);
        });
    }

    handleNavigation(browserId, command) {
        // SPEC-01b: Safe Queue Clearing
        // Do not clear the queue if there is a Sequence Gap.
        const currentState = this.registry.get(browserId);
        const commandGes = command?.ges ?? command?.metadata?.ges ?? command?.payload?.ges;
        
        if (currentState && commandGes !== undefined && commandGes !== null) {
            const expectedGes = currentState.currentGes + 1;
            if (commandGes > expectedGes) {
                logger.warn(`[ExecutionScheduler] Refusing to clear queue on navigation for [${browserId}] due to Sequence Gap. Expected GES: ${expectedGes}, Navigation GES: ${commandGes}. Deferring clearing to SequenceGate.`);
                return;
            }
        }

        logger.info(`[ExecutionScheduler] Clearing Continuous/Aggregated queues on navigation for [${browserId}]`);
        const qManager = this.browserQueues.get(browserId);
        if (qManager) {
            qManager.handleNavigation();
        }
    }

    async _drain(browserObj) {
        const browserId = browserObj.id;
        
        // Invariant 4: Prevent concurrent execution per browser
        if (this.drainLocks.has(browserId)) return;
        this.drainLocks.add(browserId);

        const qManager = this.browserQueues.get(browserId);

        try {
            while (true) {
                const nextEntry = qManager.peekNext();
                if (!nextEntry) {
                    break;
                }

                if (this.isBackpressureActive(browserId) && (nextEntry.queueClass === 'Continuous' || nextEntry.queueClass === 'Aggregated')) {
                    logger.debug(`[ExecutionScheduler] Backpressure active on [${browserId}] during drain: dropping ${nextEntry.queueClass} command ${nextEntry.command.type}`);
                    
                    getCollector().then((observabilityCollector) => {
                        observabilityCollector.emitTransition({
                            commandId: nextEntry.command.id || nextEntry.command.commandId,
                            traceId: nextEntry.command.traceId || null,
                            interactionId: nextEntry.command.interactionId || null,
                            prevState: 'ENQUEUED',
                            newState: 'DROPPED',
                            eventName: 'COMMAND_DROPPED_BACKPRESSURE',
                            owner: 'ExecutionScheduler',
                            browserId: browserId
                        });
                    }).catch(() => {});
                    
                    qManager.dequeueNext();
                    if (nextEntry.command.ges !== undefined && nextEntry.command.ges !== null) {
                        this.registry.incrementSlaveGes(browserId, false);
                    }
                    continue;
                }

                try {
                    nextEntry.dequeueTime = Date.now();
                    nextEntry.queueDelay = nextEntry.dequeueTime - nextEntry.enqueueTime;
                    
                    this.telemetry.totalDequeued++;
                    this.telemetry.cumulativeQueueWait += nextEntry.queueDelay;
                    if (nextEntry.queueDelay > this.telemetry.maxQueueWait) {
                        this.telemetry.maxQueueWait = nextEntry.queueDelay;
                    }

                    const eid = nextEntry.command.payload && nextEntry.command.payload.identityDocument ? nextEntry.command.payload.identityDocument : null;
                    const eidHash = nextEntry.command.eidHash || TelemetryCollector.computeEIDHash(eid);
                    TelemetryCollector.recordLifecycleEvent({
                        traceId: nextEntry.command.traceId || nextEntry.command.payload?.traceId || 'tr-unknown',
                        spanId: 'sp-10-' + browserId.slice(0, 4),
                        parentSpanId: 'sp-09-' + browserId.slice(0, 4),
                        stageSequence: 10,
                        stageName: 'QUEUE_DEQUEUE',
                        component: 'ExecutionScheduler.mjs',
                        method: '_drain',
                        timestamp: Date.now(),
                        browserId,
                        interactionId: nextEntry.command.payload?.interactionId || 'ia-unknown',
                        commandId: nextEntry.command.id,
                        interactionType: nextEntry.command.type,
                        stageDurationMs: nextEntry.queueDelay,
                        eidPresent: !!eid,
                        eidHash
                    });

                    getCollector().then((observabilityCollector) => {
                        observabilityCollector.emitTransition({
                            commandId: nextEntry.command.id || nextEntry.command.commandId,
                            traceId: nextEntry.command.traceId || null,
                            interactionId: nextEntry.command.interactionId || null,
                            prevState: 'ENQUEUED',
                            newState: 'DEQUEUED',
                            eventName: 'COMMAND_DEQUEUED',
                            owner: 'ExecutionScheduler',
                            browserId: browserId,
                            metadata: { queueDelay: nextEntry.queueDelay, ges: nextEntry.command.ges }
                        });
                    }).catch(() => {});

                    // Task 2.3: Enforce Queue TTL using DeadlineBudget before processing
                    const deadlineBudget = DeadlineBudget.fromCommand(nextEntry.command, 15000);
                    if (deadlineBudget.isExpired()) {
                        const errorMsg = `[LF-702] Queue deadline exceeded for Command ${nextEntry.command.id || 'unknown'} on [${browserId}] (QueueDelay: ${nextEntry.queueDelay}ms)`;
                        logger.warn(`[ExecutionScheduler] ${errorMsg}`);
                        if (TelemetryCollector && TelemetryCollector.registry && typeof TelemetryCollector.registry.recordFailureCode === 'function') {
                            TelemetryCollector.registry.recordFailureCode('LF-702');
                        }
                        this.simulator.emit('ActionFailure', { id: browserId, command: nextEntry.command, error: new QueueDeadlineExceededError(errorMsg) });
                        
                        getCollector().then((observabilityCollector) => {
                            observabilityCollector.emitTransition({
                                commandId: nextEntry.command.id || nextEntry.command.commandId,
                                traceId: nextEntry.command.traceId || null,
                                interactionId: nextEntry.command.interactionId || null,
                                prevState: 'DEQUEUED',
                                newState: 'EVICTED',
                                eventName: 'COMMAND_EVICTED',
                                owner: 'ExecutionScheduler',
                                browserId: browserId,
                                metadata: { reason: 'Queue TTL exceeded' }
                            });
                        }).catch(() => {});
                        
                        qManager.dequeueNext();
                        if (nextEntry.command.ges !== undefined && nextEntry.command.ges !== null) {
                            this.registry.incrementSlaveGes(browserId, true);
                        }
                        continue;
                    }

                    logger.info(`[Scheduler] Dispatching [${nextEntry.queueClass}] Command ${nextEntry.command.id} on [${browserId}] | QueueDelay: ${nextEntry.queueDelay}ms | Decision: ${nextEntry.schedulerDecision}`);

                    const currentState = this.registry.get(browserId);

                    if (!currentState || !currentState.page) {
                        logger.error(`[Scheduler] Dropping command ${nextEntry.command.id} on [${browserId}]: Browser/Page no longer exists in registry.`);
                        continue;
                    }

                    logger.info(`[Scheduler] Dispatching [${nextEntry.queueClass}] Command ${nextEntry.command.id} on [${browserId}] | QueueDelay: ${nextEntry.queueDelay}ms | Decision: ${nextEntry.schedulerDecision}`);

                    const finalCommand = new Command({
                        category: nextEntry.command.category,
                        type: nextEntry.command.type,
                        target: nextEntry.command.target,
                        source: nextEntry.command.source,
                        executionMode: nextEntry.command.executionMode,
                        version: nextEntry.command.version,
                        lifecycle: nextEntry.command.lifecycle,
                        id: nextEntry.command.id,
                        captureTime: nextEntry.command.captureTime,
                        creationTime: nextEntry.command.creationTime,
                        payload: nextEntry.command.payload,
                        ges: nextEntry.command.ges, // SPEC-01: Explicitly preserve GES across reconstruction boundary
                        metadata: {
                            ...nextEntry.command.metadata,
                            scheduler: {
                                enqueueTime: nextEntry.enqueueTime,
                                dequeueTime: nextEntry.dequeueTime,
                                queueDelay: nextEntry.queueDelay,
                                queueClass: nextEntry.queueClass,
                                priority: nextEntry.priority,
                                decision: nextEntry.schedulerDecision
                            }
                        },
                        traceId: nextEntry.command.traceId || nextEntry.command.payload?.traceId,
                        eidHash: nextEntry.command.eidHash || TelemetryCollector.computeEIDHash(eid)
                    });

                    if (finalCommand.type === 'navigate' || finalCommand.category === 'Navigation') {
                        this.handleNavigation(browserId, finalCommand);
                    }

                    // Sequence Gate Evaluation (Phase 7 Integration)
                    const ges = finalCommand.ges ?? finalCommand.metadata?.ges ?? finalCommand.payload?.ges;
                    if (ges !== undefined && ges !== null) {
                        const initialDecision = this.sequenceGate.evaluate(browserId, ges);
                        if (initialDecision === 'STALE') {
                            const errorMsg = `[LF-604] Stale command ${finalCommand.id || 'unknown'} on [${browserId}]: GES ${ges} is less than or equal to current Slave GES`;
                            logger.warn(`[ExecutionScheduler] ${errorMsg}`);
                            if (TelemetryCollector && TelemetryCollector.registry && typeof TelemetryCollector.registry.recordFailureCode === 'function') {
                                TelemetryCollector.registry.recordFailureCode('LF-604');
                            }
                            this.simulator.emit('ActionFailure', { id: browserId, command: finalCommand, error: new StaleCommandError(currentState.currentGes + 1, ges) });
                            qManager.dequeueNext();
                            continue;
                        }
                        
                        if (initialDecision === 'WAITING') {
                            logger.info(`[ExecutionScheduler] Command ${finalCommand.id} on [${browserId}] buffered waiting for GES alignment (target GES: ${ges})`);
                            
                            const commandContext = {
                                commandId: finalCommand.id || finalCommand.commandId,
                                traceId: finalCommand.traceId
                            };
                            
                            this.sequenceGate.startWatchdog(browserId, ges, 5000, () => {
                                const errorMsg = `[SYNC-100] Command ${finalCommand.id || 'unknown'} on [${browserId}] timed out waiting for GES alignment. Expected GES: ${ges}`;
                                logger.error(`[ExecutionScheduler] ${errorMsg}`);
                                logger.error(`[Telemetry] {"event":"SEQUENCE_GATE_TIMEOUT","commandId":"${finalCommand.id}","browserId":"${browserId}","expectedGes":${ges},"traceId":"${finalCommand.traceId}"}`);
                                
                                if (TelemetryCollector && TelemetryCollector.registry && typeof TelemetryCollector.registry.recordFailureCode === 'function') {
                                    TelemetryCollector.registry.recordFailureCode('SYNC-100');
                                }
                                
                                if (typeof TelemetryCollector.recordSyncGap === 'function') {
                                    TelemetryCollector.recordSyncGap(browserId, (currentState?.currentGes||0) + 1, ges);
                                }
                                
                                this.simulator.emit('ActionFailure', { id: browserId, command: finalCommand, error: new SequenceGapError((currentState?.currentGes||0) + 1, ges) });
                                if (ges !== undefined && ges !== null) {
                                    this.registry.incrementSlaveGes(browserId, true);
                                }
                                
                                this.simulator.emit('SYSTEM_ALERT', { type: 'SEQUENCE_TIMEOUT', browserId, expectedGes: ges, commandId: finalCommand.id });
                                
                                this._drain(browserObj);
                            }, commandContext);
                            
                            this.drainLocks.delete(browserId);
                            return; // Break out of drain loop, will be re-awoken by enqueue
                        }
                        
                        // ALIGNED: Cancel watchdog BEFORE execution to prevent race condition
                        const commandContext = {
                            commandId: finalCommand.id || finalCommand.commandId,
                            traceId: finalCommand.traceId
                        };
                        this.sequenceGate.cancelWatchdog(browserId, commandContext);
                    }

                    // Proceeding to execution, remove from queue
                    qManager.dequeueNext();

                    if (finalCommand.type === 'NOOP') {


                        logger.debug(`[Scheduler] Fast-path NOOP execution for GES ${ges} on [${browserId}]`);
                        if (ges !== undefined && ges !== null) {
                            this.registry.incrementSlaveGes(browserId, false);
                        }
                        continue;
                    }

                    // Wrap in ExecutionContext
                    const context = new ExecutionContext(finalCommand);
                    
                    // Map profile
                    const commandType = finalCommand.type ? finalCommand.type.toLowerCase() : 'default';
                    const profile = SynchronizationProfiles[commandType] || SynchronizationProfiles.default;
                    const deadline = Date.now() + profile.timeoutMs;

                    // Barrier wait
                    const barrierResult = await SynchronizationBarrier.wait({
                        browserId,
                        browserState: currentState,
                        page: currentState.page,
                        profile,
                        context,
                        deadline,
                        syncManager: this.syncManager
                    });

                    if (barrierResult.status === 'RECOVERING') {
                        logger.warn(`[Scheduler] Command ${finalCommand.id} on [${browserId}] dropped because a hard recovery (Reload/Restart) was initiated.`);
                        if (ges !== undefined && ges !== null) {
                            this.registry.incrementSlaveGes(browserId, true);
                        }
                        continue;
                    } else if (barrierResult.status !== 'PASSED') {
                        logger.error(`[Scheduler] Barrier failed for Command ${finalCommand.id} on [${browserId}]. Status: ${barrierResult.status}, Blocking: ${barrierResult.blockingCapability}`);
                        // Handle barrier failure explicitly (drop command, or recovery coordinator)
                        if (ges !== undefined && ges !== null) {
                            this.registry.incrementSlaveGes(browserId, true);
                        }
                        continue;
                    }

                    getCollector().then((observabilityCollector) => {
                        observabilityCollector.emitTransition({
                            commandId: finalCommand.id || finalCommand.commandId,
                            traceId: finalCommand.traceId || null,
                            interactionId: finalCommand.interactionId || null,
                            prevState: 'DEQUEUED',
                            newState: 'EXECUTING',
                            eventName: 'WORKER_ASSIGNED',
                            owner: 'ExecutionScheduler',
                            browserId: browserId
                        });
                    }).catch(() => {});

                    try {
                        const success = await this.simulator.execute(currentState, finalCommand, { deadlineBudget, executionContext: context });
                        if (success === false) {
                            if (ges !== undefined && ges !== null) {
                                this.registry.incrementSlaveGes(browserId, true);
                            }
                        } else if (success === true) {
                            if (ges !== undefined && ges !== null) {
                                this.registry.incrementSlaveGes(browserId, false);
                            }
                        }
                    } finally {
                        getCollector().then((observabilityCollector) => {
                            observabilityCollector.emitTransition({
                                commandId: finalCommand.id || finalCommand.commandId,
                                traceId: finalCommand.traceId || null,
                                interactionId: finalCommand.interactionId || null,
                                prevState: 'EXECUTING',
                                newState: 'RETURNED',
                                eventName: 'WORKER_RELEASED',
                                owner: 'ExecutionScheduler',
                                browserId: browserId
                            });
                        }).catch(() => {});
                    }
                } catch(e) {
                    const cId = nextEntry?.command?.id || 'unknown';
                    logger.error(`[Scheduler] Failed to process entry for ${cId}: ${e.message}`);
                    getCollector().then((observabilityCollector) => {
                        if (cId !== 'unknown') {
                            const traceDump = observabilityCollector.dumpTimeline(cId);
                            logger.error(`[Scheduler] Terminal Failure Trace for [${cId}]: ${traceDump}`);
                        }
                    }).catch(() => {});
                    if (this.syncManager && this.syncManager.recoveryCoordinator) {
                        try {
                            const snapshot = this.registry.getState(browserId);
                            const plan = await this.syncManager.recoveryCoordinator.recover(snapshot, 'PHYSICAL_EXECUTION_FAILURE');
                            if (this.syncManager.recoveryActionExecutor) {
                                await this.syncManager.recoveryActionExecutor.execute(plan);
                            }
                        } catch (recoveryErr) {
                            logger.error(`[Scheduler] Recovery cascade failed for ${browserId}: ${recoveryErr.message}`);
                        }
                    }
                    if (nextEntry?.command?.ges !== undefined && nextEntry?.command?.ges !== null) {
                        this.registry.incrementSlaveGes(browserId, true);
                    }
                }
            }
        } finally {
            this.drainLocks.delete(browserId);
        }
    }

    async waitForIdle(browserId) {
        while (this.drainLocks.has(browserId)) {
            await new Promise(r => setTimeout(r, 10));
        }
    }

    purgeAggregated(browserId) {
        const qManager = this.browserQueues.get(browserId);
        if (!qManager) return 0;
        
        const dropped = [...qManager.buckets.Aggregated];
        qManager.buckets.Aggregated = [];
        
        let sortRequired = false;
        for (const drop of dropped) {
            if (drop.command?.ges !== undefined && drop.command?.ges !== null) {
                qManager.buckets.Discrete.push({
                    command: new Command({
                        category: 'Execution',
                        type: 'NOOP',
                        ges: drop.command.ges,
                        captureTime: drop.command.captureTime,
                        metadata: { reason: 'CONVERGENCE_PURGE' }
                    }),
                    enqueueTime: Date.now(),
                    queueClass: 'Discrete',
                    priority: 'High',
                    dequeueTime: null,
                    queueDelay: 0,
                    schedulerDecision: 'NOOP Gap Filler (Convergence Purge)'
                });
                sortRequired = true;
            }
        }
        
        if (sortRequired) {
            qManager.buckets.Discrete.sort((a, b) => (a.command.ges ?? 0) - (b.command.ges ?? 0));
        }
        
        return dropped.length;
    }

    clearQueue(browserId) {
        if (this.browserQueues.has(browserId)) {
            this.browserQueues.get(browserId).clear();
        }
    }

    logTelemetry() {
        if (this.telemetry.totalEnqueued === 0) return;
        let totalDroppedHovers = 0;
        let totalCoalescedScrolls = 0;
        
        for (const qManager of this.browserQueues.values()) {
            totalDroppedHovers += qManager.stats.droppedHovers;
            totalCoalescedScrolls += qManager.stats.coalescedScrolls;
        }

        const avgWait = this.telemetry.totalDequeued > 0 
            ? Math.round(this.telemetry.cumulativeQueueWait / this.telemetry.totalDequeued) 
            : 0;

        logger.info(`[Scheduler Telemetry] AvgWait: ${avgWait}ms | MaxWait: ${this.telemetry.maxQueueWait}ms | Enqueued: ${this.telemetry.totalEnqueued} | Dequeued: ${this.telemetry.totalDequeued} | DroppedHovers: ${totalDroppedHovers} | CoalescedScrolls: ${totalCoalescedScrolls}`);
    }
}




