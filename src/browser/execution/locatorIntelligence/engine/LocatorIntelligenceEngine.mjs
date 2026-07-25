import { FeatureExtractor } from '../extraction/FeatureExtractor.mjs';
import { IdentityDocumentBuilder } from '../extraction/IdentityDocumentBuilder.mjs';
import { CandidateGenerator } from '../generation/CandidateGenerator.mjs';
import { CandidateDeduplicator } from '../generation/CandidateDeduplicator.mjs';
import { CandidateValidator } from '../validation/CandidateValidator.mjs';
import { StructuralAnalyzer } from '../validation/StructuralAnalyzer.mjs';
import { RankingEngine } from '../ranking/RankingEngine.mjs';
import { LocatorSerializer } from '../serialization/LocatorSerializer.mjs';
import { PipelineContext } from './PipelineContext.mjs';
import featureFlags from '../FeatureFlags.mjs';

export class LocatorIntelligenceEngine {
    constructor(config = {}) {
        this.config = config;
        this.pipeline = [
            new FeatureExtractor(),
            new IdentityDocumentBuilder(),
            new CandidateGenerator(),
            new CandidateDeduplicator(),
            new CandidateValidator(),
            new StructuralAnalyzer(),
            new RankingEngine(),
            new LocatorSerializer()
        ];
    }

    process(el, composedPath, config = {}) {
        const mergedConfig = { ...this.config, ...config };
        const context = new PipelineContext(el, composedPath, mergedConfig);
        if (context.metadata) {
            context.metadata.flags = featureFlags.getAll();
        }
        
        for (const step of this.pipeline) {
            const stepStart = Date.now();
            if (step.name === 'CandidateValidator' && featureFlags.isEnabled('LI_REMOVE_VALIDATOR')) {
                if (context.candidates) {
                    for (const candidate of context.candidates) {
                        candidate.validation = { status: 'SKIPPED', matchCount: -1 };
                    }
                }
                continue;
            }
            
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
