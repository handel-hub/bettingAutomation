import { PipelineStep } from '../engine/PipelineStep.mjs';
import { ScoringWeights } from './ScoringWeights.mjs';
import { ScoringVector } from '../models/ScoringVector.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { NormalizedBaseScoreRule } from './RankingRules/NormalizedBaseScoreRule.mjs';
import { NormalizedStructuralRule } from './RankingRules/NormalizedStructuralRule.mjs';
import { NormalizedDynamicContentRule } from './RankingRules/NormalizedDynamicContentRule.mjs';
import { NormalizedSpecificityRule } from './RankingRules/NormalizedSpecificityRule.mjs';
import { NormalizedCorroborationRule } from './RankingRules/NormalizedCorroborationRule.mjs';
import { NormalizedVisibilityRule } from './RankingRules/NormalizedVisibilityRule.mjs';

export class AdditiveRankingEngine extends PipelineStep {
    constructor(weights = null) {
        super('AdditiveRankingEngine');
        this.weights = weights || new ScoringWeights();
        this.rules = [
            new NormalizedBaseScoreRule(),
            new NormalizedStructuralRule(),
            new NormalizedDynamicContentRule(),
            new NormalizedSpecificityRule(),
            new NormalizedCorroborationRule(),
            new NormalizedVisibilityRule()
        ];
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        for (const candidate of context.candidates) {
            const vector = this._evaluateRules(candidate, context);
            candidate.ranking = candidate.ranking || {};
            candidate.ranking.scoringVector = vector;
            candidate.ranking.finalScore = vector.aggregateScore;
            candidate.ranking.scoreBreakdown = vector.breakdown;
            candidate.telemetry = candidate.telemetry || {};
            candidate.telemetry.rankedAt = Date.now();
        }

        context.candidates.sort((a, b) => this._resolveTies(a, b));

        context.candidates.forEach((c, index) => {
            c.rank = index + 1;
        });

        TelemetryCollector.recordRanking({ candidates: context.candidates });
    }

    _evaluateRules(candidate, context) {
        const dimensions = {};
        const breakdown = {};

        for (const rule of this.rules) {
            try {
                const result = rule.evaluate(candidate, context);
                if (result && result.dimension) {
                    dimensions[result.dimension] = result.score;
                    breakdown[rule.name] = result.score;
                    const legacyName = rule.name.replace('Normalized', '');
                    breakdown[legacyName] = result.score;
                }
            } catch (e) {
                console.warn(`[AdditiveRankingEngine] Rule ${rule.name} failed:`, e);
            }
        }

        return new ScoringVector(dimensions, this.weights.toMap(), breakdown);
    }

    _resolveTies(a, b) {
        if (Math.abs(b.ranking.finalScore - a.ranking.finalScore) > 0.0001) {
            return b.ranking.finalScore - a.ranking.finalScore;
        }

        const stratA = a.ranking.scoringVector?.dimensions.strategyReliability || 0;
        const stratB = b.ranking.scoringVector?.dimensions.strategyReliability || 0;
        if (Math.abs(stratB - stratA) > 0.0001) {
            return stratB - stratA;
        }

        const structA = a.ranking.scoringVector?.dimensions.structuralStability || 0;
        const structB = b.ranking.scoringVector?.dimensions.structuralStability || 0;
        if (Math.abs(structB - structA) > 0.0001) {
            return structB - structA;
        }

        const corrA = a.ranking.scoringVector?.dimensions.corroboration || 0;
        const corrB = b.ranking.scoringVector?.dimensions.corroboration || 0;
        if (Math.abs(corrB - corrA) > 0.0001) {
            return corrB - corrA;
        }

        const priorityMap = {
            'DataAttributeStrategy': 6,
            'RoleStrategy': 5,
            'AriaStrategy': 4,
            'TextStrategy': 3,
            'SemanticClassStrategy': 2,
            'StructuralStrategy': 1
        };
        const prioA = priorityMap[a.strategy] || 0;
        const prioB = priorityMap[b.strategy] || 0;
        if (prioB !== prioA) {
            return prioB - prioA;
        }

        const lenA = (a.locator || '').length;
        const lenB = (b.locator || '').length;
        if (lenA !== lenB) {
            return lenA - lenB;
        }

        const locA = a.locator || '';
        const locB = b.locator || '';
        if (locA < locB) return -1;
        if (locA > locB) return 1;
        return 0;
    }
}
export default AdditiveRankingEngine;
