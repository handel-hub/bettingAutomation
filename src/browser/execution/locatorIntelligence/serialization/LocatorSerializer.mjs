export class LocatorSerializer extends PipelineStep {
    constructor() {
        super('LocatorSerializer');
    }

    execute(context) {
        const candidates = context.candidates || [];
        
        context.output = {
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
