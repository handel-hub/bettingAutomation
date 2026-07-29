import { globalRecorder } from '../RuntimeKnowledgePlatform.mjs';

/**
 * Attaches to the SynchronizationManager's internal telemetry objects
 * to stream out-of-band events to the RKP Layer without allocating memory in the hot path.
 */
export function attachSyncTelemetryAdapter(syncManager) {
    if (!syncManager || process.env.RKP_ENABLED === 'false') return;

    // 1. Intercept SynchronizationTelemetry (Measurements & Decisions)
    if (syncManager.telemetry) {
        const origRecordBarrier = syncManager.telemetry.recordBarrier;
        syncManager.telemetry.recordBarrier = function(latencyMs, success) {
            if (typeof origRecordBarrier === 'function') {
                origRecordBarrier.call(this, latencyMs, success);
            }
            try {
                globalRecorder.record({
                    domain: 'Synchronization',
                    type: 'Measurement',
                    traceId: 'sync-barrier',
                    spanId: 'sync-barrier-' + Date.now(),
                    metricName: 'BarrierWaitTime',
                    value: latencyMs,
                    unit: 'ms'
                });
            } catch (err) {
                // Passive failure
            }
        };

        const origRecordRecovery = syncManager.telemetry.recordRecovery;
        syncManager.telemetry.recordRecovery = function(result) {
            if (typeof origRecordRecovery === 'function') {
                origRecordRecovery.call(this, result);
            }
            try {
                globalRecorder.record({
                    domain: 'Synchronization',
                    type: 'Decision',
                    traceId: 'sync-recovery',
                    spanId: 'sync-recovery-' + Date.now(),
                    actionTaken: 'ExecuteRecovery',
                    alternativesDiscarded: [],
                    confidenceScore: 1.0,
                    evidence: {
                        constraintsEvaluated: ['ConsistencyPolicy'],
                        metrics: { elapsed: result.elapsed, status: result.status }
                    }
                });
            } catch (err) {
                // Passive failure
            }
        };
    }

    // 2. Intercept SynchronizationTimeline (Decisions)
    if (syncManager.timeline) {
        const origRecord = syncManager.timeline.record;
        syncManager.timeline.record = function(event) {
            if (typeof origRecord === 'function') {
                origRecord.call(this, event);
            }
            try {
                globalRecorder.record({
                    domain: 'Synchronization',
                    type: 'Decision',
                    traceId: 'sync-timeline',
                    spanId: 'sync-timeline-' + Date.now(),
                    actionTaken: event.type,
                    alternativesDiscarded: [],
                    confidenceScore: 1.0,
                    evidence: {
                        constraintsEvaluated: ['SynchronizationBarrier'],
                        metrics: { 
                            browserId: event.browserId, 
                            satisfied: event.satisfied ? 1 : 0 
                        }
                    }
                });
            } catch (err) {
                // Passive failure
            }
        };
    }
}
