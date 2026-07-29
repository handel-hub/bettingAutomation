import { PipelineStep } from '../engine/PipelineStep.mjs';
import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class LocatorSerializer extends PipelineStep {
    constructor() {
        super('LocatorSerializer');
    }

    execute(context) {
        const candidates = context.candidates || [];
        const serializeFeatures = featureFlags.isEnabled('LI_SERIALIZE_FEATURES');
        
        let shadowPath = [];
        if (context.composedPath && Array.isArray(context.composedPath)) {
            for (let i = 0; i < context.composedPath.length; i++) {
                const node = context.composedPath[i];
                if (node && node.nodeType === 11) { // ShadowRoot
                    const host = node.host || context.composedPath[i + 1];
                    if (host && host.nodeType === 1) {
                        let selector = host.nodeName.toLowerCase();
                        if (host.id && !/\d+/.test(host.id)) {
                            selector += '#' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(host.id) : host.id);
                        }
                        shadowPath.unshift(selector);
                    }
                }
            }
        }
        
        context.output = {
            shadowPath,
            identityDocument: context.identityDocument ? (typeof context.identityDocument.serialize === 'function' ? context.identityDocument.serialize() : context.identityDocument) : null,
            locators: candidates.map(c => ({
                id: c.id,
                strategy: c.strategy,
                locator: c.locator,
                rank: c.rank,
                reason: c.reason,
                generatedBy: context.config?.debug ? c.generatedBy : undefined,
                validation: context.config?.debug ? c.validation : undefined,
                structural: context.config?.debug ? c.structural : undefined,
                ranking: {
                    baseScore: context.config?.debug ? c.ranking.baseScore : undefined,
                    finalScore: c.ranking.finalScore,
                    scoringVector: (serializeFeatures && c.ranking.scoringVector) ? (typeof c.ranking.scoringVector.toBreakdown === 'function' ? c.ranking.scoringVector.toBreakdown() : c.ranking.scoringVector.dimensions) : undefined,
                    scoreBreakdown: context.config?.debug ? c.ranking.scoreBreakdown : undefined
                },
                telemetry: context.config?.debug ? c.telemetry : undefined
            })),
            metadata: {
                ...context.metadata,
                platform: context.platform || context.metadata?.platform || null,
                schedulingDirective: context.schedulingDirective || context.metadata?.schedulingDirective || null,
                captureEpoch: context.navigationEpoch ?? context.metadata?.captureEpoch ?? 0,
                generationMetrics: {
                    durationMs: context.telemetry.pipelineDurationMs,
                    candidateCount: candidates.length,
                    stages: context.telemetry.stages
                }
            }
        };

        const eid = context.output.identityDocument;
        const eidHash = TelemetryCollector.computeEIDHash(eid);
        let valRes4 = 'PASS';
        let err4 = null;
        
        const isEidValid = eid && (eid.confidenceScore === undefined || eid.confidenceScore > 0) && (eid.identityHash || eid.fingerprint);
        
        if (!isEidValid) {
            valRes4 = 'FAIL_LF602';
            err4 = { errorCode: 'LF-602', errorMessage: 'Payload Assembly missing or invalid identityDocument at Stage 4' };
        }
        TelemetryCollector.recordLifecycleEvent({
            traceId: context.metadata?.traceId || 'tr-unknown',
            spanId: 'sp-04',
            parentSpanId: 'sp-02',
            stageSequence: 4,
            stageName: 'PAYLOAD_ASSEMBLED',
            component: 'LocatorSerializer.mjs',
            method: 'execute',
            timestamp: Date.now(),
            interactionId: context.metadata?.interactionId || 'ia-unknown',
            interactionType: context.metadata?.interactionType || 'CLICK',
            eidPresent: !!eid,
            eidHash,
            validationResult: valRes4,
            errorDetails: err4
        });

        try {
            const serializedStr = JSON.stringify(context.output);
            TelemetryCollector.recordLifecycleEvent({
                traceId: context.metadata?.traceId || 'tr-unknown',
                spanId: 'sp-05',
                parentSpanId: 'sp-04',
                stageSequence: 5,
                stageName: 'WIRE_SERIALIZED',
                component: 'LocatorSerializer.mjs',
                method: 'execute',
                timestamp: Date.now(),
                interactionId: context.metadata?.interactionId || 'ia-unknown',
                interactionType: context.metadata?.interactionType || 'CLICK',
                payloadSize: serializedStr.length,
                serializationSize: serializedStr.length,
                eidPresent: !!eid,
                eidHash
            });
        } catch (e) {
            // Ignore serialization error in telemetry calculation
        }
    }
}

