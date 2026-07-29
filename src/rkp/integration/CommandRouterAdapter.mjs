import { globalRecorder } from '../RuntimeKnowledgePlatform.mjs';

/**
 * Attaches to the CommandRouter's EventEmitter to translate ingress routing events
 * into NetworkDecisionFact and NetworkMeasurementFact asynchronously, completely bypassing
 * the routing hot-path allocation bottleneck.
 */
export function attachCommandRouterAdapter(router) {
    if (!router || typeof router.on !== 'function') return;

    if (process.env.RKP_ENABLED === 'false' || process.env.RKP_IPC_HEADERS === 'false') {
        return;
    }

    router.on('routed', ({ command, category, protocolVersion, handlers, headers }) => {
        // Extract HLC from side-channel envelope headers if present
        const hlcStamp = headers && headers['X-RKP-HLC'];
        const traceId = headers && headers['X-RKP-Trace-Id'] || command.id || command.commandId || 'unknown-trace';
        const spanId = headers && headers['X-RKP-Span-Id'] || 'unknown-span';

        try {
            globalRecorder.record({
                domain: 'Network',
                type: 'Decision',
                traceId,
                spanId,
                hlc: hlcStamp || undefined,
                actionTaken: 'RouteCommand',
                alternativesDiscarded: [],
                confidenceScore: 1.0,
                evidence: {
                    constraintsEvaluated: ['SchemaValidation'],
                    metrics: {
                        protocolVersion: parseFloat(protocolVersion) || 2.0,
                        handlersTargeted: handlers
                    }
                }
            });

            globalRecorder.record({
                domain: 'Network',
                type: 'Measurement',
                traceId,
                spanId,
                hlc: hlcStamp || undefined,
                metricName: 'CommandIngress',
                value: JSON.stringify(command).length,
                unit: 'bytes'
            });
        } catch (err) {
            // Swallow telemetry failures to preserve core routing
            console.error('[RKP Adapter] CommandRouter serialization failed', err);
        }
    });

    router.on('rejected', ({ command, reason, headers }) => {
        const hlcStamp = headers && headers['X-RKP-HLC'];
        const traceId = headers && headers['X-RKP-Trace-Id'] || command?.id || command?.commandId || 'unknown-trace';
        const spanId = headers && headers['X-RKP-Span-Id'] || 'unknown-span';

        try {
            globalRecorder.record({
                domain: 'Network',
                type: 'Decision',
                traceId,
                spanId,
                hlc: hlcStamp || undefined,
                actionTaken: 'RejectCommand',
                alternativesDiscarded: ['RouteCommand'],
                confidenceScore: 1.0,
                evidence: {
                    constraintsEvaluated: ['SchemaValidation', 'CategoryExistence'],
                    metrics: {
                        rejectionReason: reason
                    }
                }
            });
        } catch (err) {
            console.error('[RKP Adapter] CommandRouter rejection serialization failed', err);
        }
    });
}
