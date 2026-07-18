export class LocatorIntelligenceEngine {
    constructor() {
        this.pipeline = [
            new FeatureExtractor(),
            new CandidateGenerator(),
            new CandidateDeduplicator(),
            new CandidateValidator(),
            new StructuralAnalyzer(),
            new RankingEngine(),
            new LocatorSerializer()
        ];
    }

    process(el) {
        const context = new PipelineContext(el);
        
        for (const step of this.pipeline) {
            const stepStart = Date.now();
            
            try {
                step.execute(context);
            } catch (e) {
                console.warn(`[LocatorIntelligence] Pipeline step ${step.name} failed:`, e);
            }
            
            context.telemetry.stages[step.name] = Date.now() - stepStart;
        }
        
        context.telemetry.pipelineDurationMs = Date.now() - context.metadata.startTime;
        
        // Return the serialized output, which the Serializer places into context.output
        return context.output;
    }
}
