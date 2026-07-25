import { RankingRule } from '../RankingRule.mjs';

export class NormalizedStructuralRule extends RankingRule {
    constructor() {
        super('NormalizedStructuralRule');
    }

    evaluate(candidate, context) {
        let score = 1.0;
        const structScore = candidate.structural?.score;
        
        if (structScore === 'HIGH') score = 1.0;
        else if (structScore === 'MEDIUM') score = 0.9;
        else if (structScore === 'LOW') score = 0.5;
        
        return {
            dimension: 'structuralStability',
            score,
            reason: `Structural stability is ${structScore || 'default'} (${score})`
        };
    }
}
export default NormalizedStructuralRule;
