import { logger } from '../../config.mjs';
import { Command } from './Command.mjs';
import { ExecutionContext } from './ExecutionContext.mjs';
import { SynchronizationProfiles } from '../synchronization/profiles/SynchronizationProfiles.mjs';
import { SynchronizationBarrier } from '../synchronization/SynchronizationBarrier.mjs';


export class ClassificationPolicy {
    static classify(command) {
        if (!command || !command.type) return { class: 'Discrete', priority: 'High' };
        const t = command.type.toLowerCase();
        
        // Critical overrides
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
        if (queueClass === 'Discrete' || queueClass === 'Critical') {
            queueBucket.push(entry);
            entry.schedulerDecision = 'Enqueued FIFO';
        } else if (queueClass === 'Continuous') {
            const existed = queueBucket.length > 0;
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
                            metadata: existing.command.metadata,
                            version: existing.command.version,
                            lifecycle: existing.command.lifecycle,
                            id: existing.command.id,
                            captureTime: existing.command.captureTime,
                            creationTime: existing.command.creationTime,
                            payload: {
                               ...existing.command.payload,
                               deltas: { deltaX: edx + ndx, deltaY: edy + ndy }
                            }
                        });
                        entry.schedulerDecision = 'Coalesced Payload';
                    }
                } else {
                    // Absolute target overwrite for window_scroll/element_scroll 
                    queueBucket[0] = entry;
                    entry.schedulerDecision = 'Overwrote Pending Scroll';
                }
            }
        }
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
        if (queueClass === 'Discrete' && this.buckets.Discrete.length >= 100) {
            throw new Error('Queue Limit Exceeded: Discrete Queue overflowed (max 100). FATAL_DESYNC.');
        }
        SchedulingPolicy.apply(this.buckets[queueClass], queueClass, entry);
        if (entry.schedulerDecision && entry.schedulerDecision.includes('Overwrote')) {
            this.stats.droppedHovers++;
        }
        if (entry.schedulerDecision && entry.schedulerDecision.includes('Coalesced')) {
            this.stats.coalescedScrolls++;
        }
    }

    dequeueNext() {
        // Priority: Critical -> Discrete -> Aggregated -> Continuous
        const order = ['Critical', 'Discrete', 'Aggregated', 'Continuous'];
        const now = Date.now();
        
        for (const queueClass of order) {
            const bucket = this.buckets[queueClass];
            while (bucket.length > 0) {
                const entry = bucket.shift();
                
                // TTL Expiration for non-critical non-discrete
                if (queueClass === 'Continuous' || queueClass === 'Aggregated') {
                    if (now - entry.enqueueTime > 1500) {
                        logger.debug(`[ExecutionScheduler] Expired stale ${queueClass} command (>${now - entry.enqueueTime}ms)`);
                        continue;
                    }
                }
                
                return entry;
            }
        }
        return null;
    }

    clear() {
        this.buckets = { Critical: [], Discrete: [], Aggregated: [], Continuous: [] };
    }
    
    handleNavigation() {
        this.buckets.Continuous = [];
        this.buckets.Aggregated = [];
        // Preserve discrete if navigation originated from it, otherwise flush
        this.buckets.Discrete = this.buckets.Discrete.filter(entry => 
            entry.command.type === 'navigate' || entry.command.type === 'CLICK' || entry.command.category === 'Navigation'
        );
    }
}

export class ExecutionScheduler {
    constructor(actionSimulator) {
        this.simulator = actionSimulator;
        this.browserQueues = new Map();
        this.drainLocks = new Set();
        this.telemetry = {
            totalEnqueued: 0,
            totalDequeued: 0,
            cumulativeQueueWait: 0,
            maxQueueWait: 0,
        };
        
        this.telemetryIntervalId = setInterval(() => this.logTelemetry(), 10000);
    }

    dispose() {
        if (this.telemetryIntervalId) {
            clearInterval(this.telemetryIntervalId);
            this.telemetryIntervalId = null;
        }
        this.browserQueues.clear();
        this.drainLocks.clear();
    }

    enqueue(browserObj, command) {
        const browserId = browserObj.id;
        if (!this.browserQueues.has(browserId)) {
            this.browserQueues.set(browserId, new QueueManager());
        }

        const qManager = this.browserQueues.get(browserId);
        
        const { class: queueClass, priority } = ClassificationPolicy.classify(command);
        
        const entry = {
            command: command,
            enqueueTime: Date.now(),
            queueClass: queueClass,
            priority: priority,
            dequeueTime: null,
            queueDelay: 0,
            schedulerDecision: null
        };

        if (command.type === 'navigate' || command.category === 'Navigation') {
            qManager.handleNavigation();
        }

        try {
            qManager.insert(queueClass, entry);
            this.telemetry.totalEnqueued++;
        } catch (err) {
            logger.fatal(`[ExecutionScheduler] ${err.message} on slave [${browserId}]`);
            this.simulator.emit('ActionFailure', { id: browserId, command, error: err });
            return;
        }

        this._drain(browserObj).catch(err => {
            logger.error(`[ExecutionScheduler] Unhandled drain error on [${browserId}]: ${err.message}`);
        });
    }

    async _drain(browserObj) {
        const browserId = browserObj.id;
        
        // Invariant 4: Prevent concurrent execution per browser
        if (this.drainLocks.has(browserId)) return;
        this.drainLocks.add(browserId);

        const qManager = this.browserQueues.get(browserId);

        try {
            while (true) {
                const nextEntry = qManager.dequeueNext();
                if (!nextEntry) {
                    break;
                }

                try {
                    nextEntry.dequeueTime = Date.now();
                    nextEntry.queueDelay = nextEntry.dequeueTime - nextEntry.enqueueTime;
                    
                    this.telemetry.totalDequeued++;
                    this.telemetry.cumulativeQueueWait += nextEntry.queueDelay;
                    if (nextEntry.queueDelay > this.telemetry.maxQueueWait) {
                        this.telemetry.maxQueueWait = nextEntry.queueDelay;
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
                        }
                    });

                    // Wrap in ExecutionContext
                    const context = new ExecutionContext(finalCommand);
                    
                    // Map profile
                    const commandType = finalCommand.type ? finalCommand.type.toLowerCase() : 'default';
                    const profile = SynchronizationProfiles[commandType] || SynchronizationProfiles.default;
                    const deadline = Date.now() + profile.timeoutMs;

                    // Barrier wait
                    const barrierResult = await SynchronizationBarrier.wait({
                        browserId,
                        page: browserObj.page,
                        profile,
                        context,
                        deadline
                    });

                    if (barrierResult.status !== 'PASSED') {
                        logger.error(`[Scheduler] Barrier failed for Command ${finalCommand.id} on [${browserId}]. Status: ${barrierResult.status}, Blocking: ${barrierResult.blockingCapability}`);
                        // Handle barrier failure explicitly (drop command, or recovery coordinator)
                        continue;
                    }

                    await this.simulator.execute(browserObj, finalCommand);
                } catch(e) {
                    logger.error(`[Scheduler] Failed to process entry for ${nextEntry?.command?.id ?? 'unknown'}: ${e.message}`);
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
