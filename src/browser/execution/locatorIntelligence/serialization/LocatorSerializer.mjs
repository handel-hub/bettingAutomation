import { PipelineStep } from '../engine/PipelineStep.mjs';

export class LocatorSerializer extends PipelineStep {
    constructor() {
        super('LocatorSerializer');
    }

    execute(context) {
        const candidates = context.candidates || [];
        
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
                    scoreBreakdown: context.config?.debug ? c.ranking.scoreBreakdown : undefined
                },
                telemetry: context.config?.debug ? c.telemetry : undefined
            })),
            metadata: {
                ...context.metadata,
                generationMetrics: {
                    durationMs: context.telemetry.pipelineDurationMs,
                    candidateCount: candidates.length,
                    stages: context.telemetry.stages
                }
            }
        };
    }
}
