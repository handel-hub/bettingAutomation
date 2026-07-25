import { FeatureExtractor } from '../extraction/FeatureExtractor.mjs';
import { IdentityDocumentBuilder } from '../extraction/IdentityDocumentBuilder.mjs';
import { CandidateGenerator } from '../generation/CandidateGenerator.mjs';
import { CandidateDeduplicator } from '../generation/CandidateDeduplicator.mjs';
import { CandidateValidator } from '../validation/CandidateValidator.mjs';
import { StructuralAnalyzer } from '../validation/StructuralAnalyzer.mjs';
import { RankingEngine } from '../ranking/RankingEngine.mjs';
import { AdditiveRankingEngine } from '../ranking/AdditiveRankingEngine.mjs';
import { LocatorSerializer } from '../serialization/LocatorSerializer.mjs';
import { PipelineContext } from './PipelineContext.mjs';
import featureFlags from '../FeatureFlags.mjs';

export class LocatorIntelligenceEngine {
    constructor(config = {}) {
        this.config = config;
        this.rankingEngine = new RankingEngine();
        this.additiveRankingEngine = new AdditiveRankingEngine();
        this.pipeline = [
            new FeatureExtractor(),
            new IdentityDocumentBuilder(),
            new CandidateGenerator(),
            new CandidateDeduplicator(),
            new CandidateValidator(),
            new StructuralAnalyzer(),
            this.rankingEngine,
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

            let currentStep = step;
            if (step.name === 'RankingEngine' && featureFlags.isEnabled('LI_ADDITIVE_SCORING')) {
                currentStep = this.additiveRankingEngine;
            }
            
            try {
                currentStep.execute(context);
            } catch (e) {
                console.warn(`[LocatorIntelligence] Pipeline step ${currentStep.name} failed:`, e);
            }
            
            context.telemetry.stages[currentStep.name] = Date.now() - stepStart;
        }
        
        context.telemetry.pipelineDurationMs = Date.now() - context.metadata.startTime;
        
        // Return the serialized output, which the Serializer places into context.output
        return context.output;
    }
}
