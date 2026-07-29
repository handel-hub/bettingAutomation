import { globalRecorder } from '../RuntimeKnowledgePlatform.mjs';
import { TelemetryCollector } from '../../browser/execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';

/**
 * Attaches an RKP listener to the TelemetryCollector's onDispatch hook.
 * This translates batch legacy events into discrete Measurement and Decision facts.
 */
export function attachTelemetryAdapter() {
    if (process.env.RKP_ENABLED === 'false') return;

    const originalDispatch = TelemetryCollector.onDispatch;

    TelemetryCollector.onDispatch = (serialized, batch) => {
        if (typeof originalDispatch === 'function') {
            try {
                originalDispatch(serialized, batch);
            } catch (err) {
                // Ignore original dispatch errors
            }
        }

        if (!Array.isArray(batch)) return;

        for (const ev of batch) {
            try {
                // Determine Fact Type based on event nature
                if (ev.validationResult && ev.validationResult.startsWith('FAIL')) {
                    globalRecorder.record({
                        domain: 'Locator',
                        type: 'Failure',
                        traceId: ev.traceId || 'unknown',
                        spanId: ev.spanId || 'unknown',
                        recoveryStrategy: 'None',
                        errorMessage: ev.errorDetails?.message || 'Lifecycle Event Failure',
                        errorCode: ev.errorDetails?.errorCode || ev.validationResult
                    });
                } else if (ev.stageName === 'RESOLUTION' || ev.stageName === 'EVALUATION') {
                    globalRecorder.record({
                        domain: 'Locator',
                        type: 'Decision',
                        traceId: ev.traceId || 'unknown',
                        spanId: ev.spanId || 'unknown',
                        actionTaken: ev.interactionType || 'UNKNOWN_ACTION',
                        alternativesDiscarded: [],
                        confidenceScore: 1.0,
                        evidence: {
                            constraintsEvaluated: ['LocatorExistence', 'Visibility'],
                            metrics: {
                                stageSequence: ev.stageSequence,
                                epoch: ev.epoch
                            }
                        }
                    });
                } else {
                    globalRecorder.record({
                        domain: 'Locator',
                        type: 'Measurement',
                        traceId: ev.traceId || 'unknown',
                        spanId: ev.spanId || 'unknown',
                        metricName: ev.stageName || 'LifecyclePhase',
                        value: ev.stageDurationMs || 0,
                        unit: 'ms'
                    });
                }
            } catch (err) {
                console.error('[RKP TelemetryAdapter] Failed to serialize event:', err);
            }
        }
    };
}
