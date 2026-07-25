import { PipelineStep } from '../engine/PipelineStep.mjs';
import { DataAttributeStrategy } from './strategies/DataAttributeStrategy.mjs';
import { TextStrategy } from './strategies/TextStrategy.mjs';
import { AriaStrategy } from './strategies/AriaStrategy.mjs';
import { RoleStrategy } from './strategies/RoleStrategy.mjs';
import { SemanticClassStrategy } from './strategies/SemanticClassStrategy.mjs';
import { StructuralStrategy } from './strategies/StructuralStrategy.mjs';

export class CandidateGenerator extends PipelineStep {
    constructor() {
        super('CandidateGenerator');
    }

    execute(context) {
        if (!context.features) return;
        
        let candidates = [];
        const strategies = [
            DataAttributeStrategy, TextStrategy, AriaStrategy, RoleStrategy, 
            SemanticClassStrategy, StructuralStrategy
        ];

        for (const strat of strategies) {
            try {
                candidates.push(...strat.generate(context.element, context.features));
            } catch (e) {
                console.warn(`[CandidateGenerator] Strategy ${strat.name} failed`, e);
            }
        }

        context.candidates = candidates;
    }
}
