import { FeatureExtractor } from '../extraction/FeatureExtractor.mjs';
import { IdentityDocumentBuilder } from '../extraction/IdentityDocumentBuilder.mjs';
import { CandidateGenerator } from '../generation/CandidateGenerator.mjs';
import { CandidateDeduplicator } from '../generation/CandidateDeduplicator.mjs';
import { SportyBetConfirmationClassifier } from '../platforms/sportybet/SportyBetConfirmationClassifier.mjs';

import { StructuralAnalyzer } from '../validation/StructuralAnalyzer.mjs';
import { RankingEngine } from '../ranking/RankingEngine.mjs';
import { AdditiveRankingEngine } from '../ranking/AdditiveRankingEngine.mjs';
import { InferenceEngine } from '../inference/InferenceEngine.mjs';
import { LocatorSerializer } from '../serialization/LocatorSerializer.mjs';
import { PipelineContext } from './PipelineContext.mjs';
import featureFlags from '../FeatureFlags.mjs';

export class LocatorIntelligenceEngine {
    constructor(config = {}) {
        this.config = config;
        this.rankingEngine = new RankingEngine();
        this.additiveRankingEngine = new AdditiveRankingEngine();
        this.inferenceEngine = new InferenceEngine();
        this.pipeline = [
            new FeatureExtractor(),
            new IdentityDocumentBuilder(),
            new CandidateGenerator(),
            new CandidateDeduplicator()
        ];
        
        // V1 Technical Debt: Platform-Specific Classification
        if (featureFlags.isEnabled('enableSportyBetConfirmationClassifier')) {
            // Note: Checking CurrentPlatform == 'SPORTYBET' would ideally be done here,
            // but config.platform is usually available. We will assume the flag itself
            // gates it appropriately for now or checking config.platform inside.
            this.pipeline.push(new SportyBetConfirmationClassifier());
        }

        this.pipeline.push(
            new StructuralAnalyzer(),
            this.rankingEngine,
            new LocatorSerializer()
        );
    }

    process(el, composedPath, config = {}) {
        const mergedConfig = { ...this.config, ...config };
        const context = new PipelineContext(el, composedPath, mergedConfig);
        if (context.metadata) {
            context.metadata.flags = featureFlags.getAll();
        }
        
        for (const step of this.pipeline) {
            const stepStart = Date.now();


            let currentStep = step;
            if (step.name === 'RankingEngine') {
                if (featureFlags.isEnabled('INFERENCE_ENGINE_V2') || featureFlags.isEnabled('LI_INFERENCE_ENGINE_V2')) {
                    try {
                        this.inferenceEngine.infer(context.identityDocument || context.metadata?.identityDocument, context.candidates);
                    } catch (e) {
                        console.warn(`[LocatorIntelligence] Pipeline step InferenceEngine failed:`, e);
                    }
                    context.telemetry.stages['InferenceEngine'] = Date.now() - stepStart;
                    continue;
                } else if (featureFlags.isEnabled('LI_ADDITIVE_SCORING')) {
                    currentStep = this.additiveRankingEngine;
                }
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
