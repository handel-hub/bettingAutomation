import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class RankingEngine extends PipelineStep {
    constructor() {
        super('RankingEngine');
        this.configRules = RankingConfig.getRules();
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        const activeRules = this.configRules
            .filter(r => r.enabled)
            .sort((a, b) => b.priority - a.priority)
            .map(r => r.rule);

        for (const candidate of context.candidates) {
            candidate.ranking.scoreBreakdown = {};
            
            for (const rule of activeRules) {
                const result = rule.evaluate(candidate, context);
                
                if (result.baseScore !== undefined) {
                    candidate.ranking.baseScore = result.baseScore;
                    candidate.ranking.finalScore = result.baseScore;
                    candidate.ranking.scoreBreakdown[rule.name] = result.baseScore;
                }
                if (result.scoreDelta !== undefined) {
                    candidate.ranking.baseScore = (candidate.ranking.baseScore || 0) + result.scoreDelta;
                    candidate.ranking.finalScore = (candidate.ranking.finalScore || 0) + result.scoreDelta;
                    candidate.ranking.scoreBreakdown[rule.name] = result.scoreDelta;
                }
                if (result.multiplier !== undefined) {
                    candidate.ranking.finalScore *= result.multiplier;
                    candidate.ranking.scoreBreakdown[rule.name] = result.multiplier;
                }
            }
            candidate.telemetry.rankedAt = Date.now();
        }

        // Deterministic sorting with Tie Breakers
        // Higher Final Score -> Higher Validation Status -> Higher Specificity -> Lower Complexity -> Higher Corroboration -> Strategy Stability -> Shorter Locator -> Generation Order
        
        const statusValue = { 'UNIQUE': 3, 'NOT_VERIFIABLE': 2, 'AMBIGUOUS': 1, 'MISSING': 0, 'INVALID': -1 };
        
        context.candidates.sort((a, b) => {
            if (b.ranking.finalScore !== a.ranking.finalScore) {
                return b.ranking.finalScore - a.ranking.finalScore;
            }
            
            const valA = statusValue[a.validation.status] ?? 0;
            const valB = statusValue[b.validation.status] ?? 0;
            if (valB !== valA) return valB - valA;
            
            const specA = a.ranking.scoreBreakdown['SpecificityRule'] ?? 1;
            const specB = b.ranking.scoreBreakdown['SpecificityRule'] ?? 1;
            if (specB !== specA) return specB - specA;
            
            const compA = a.ranking.scoreBreakdown['ComplexityRule'] ?? 1;
            const compB = b.ranking.scoreBreakdown['ComplexityRule'] ?? 1;
            if (compA !== compB) return compA - compB; // Lower multiplier means higher penalty, so lower complexity = higher multiplier
            
            const corrA = a.ranking.scoreBreakdown['CorroborationRule'] ?? 1;
            const corrB = b.ranking.scoreBreakdown['CorroborationRule'] ?? 1;
            if (corrB !== corrA) return corrB - corrA;
            
            const stratA = a.ranking.scoreBreakdown['BaseScoreRule'] ?? 0;
            const stratB = b.ranking.scoreBreakdown['BaseScoreRule'] ?? 0;
            if (stratA !== stratB) return stratB - stratA;
            
            const lenA = (a.locator || '').length;
            const lenB = (b.locator || '').length;
            if (lenA !== lenB) return lenA - lenB;
            
            return 0; // Generation order is preserved
        });

        // Assign ordinal rank
        context.candidates.forEach((c, index) => {
            c.rank = index + 1;
        });

        TelemetryCollector.recordRanking({ candidates: context.candidates });
    }
}
