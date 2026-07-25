import { RankingRule } from '../RankingRule.mjs';

export class NormalizedBaseScoreRule extends RankingRule {
    constructor() {
        super('NormalizedBaseScoreRule');
    }

    evaluate(candidate, context) {
        let score = 0.10;
        switch (candidate.strategy) {
            case 'DataAttributeStrategy': score = 1.0; break;
            case 'RoleStrategy': score = 0.80; break;
            case 'AriaStrategy': score = 0.70; break;
            case 'TextStrategy': score = 0.60; break;
            case 'SemanticClassStrategy': score = 0.50; break;
            case 'StructuralStrategy': score = 0.30; break;
            default: score = 0.10; break;
        }
        return {
            dimension: 'strategyReliability',
            score,
            reason: `Strategy ${candidate.strategy} has reliability ${score}`
        };
    }
}
export default NormalizedBaseScoreRule;
