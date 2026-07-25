import { RankingRule } from '../RankingRule.mjs';

export class NormalizedCorroborationRule extends RankingRule {
    constructor() {
        super('NormalizedCorroborationRule');
    }

    evaluate(candidate, context) {
        const count = candidate.generatedBy ? candidate.generatedBy.length : 1;
        let score = 0.5;
        
        if (count >= 3) score = 1.0;
        else if (count === 2) score = 0.8;
        else score = 0.5;
        
        return {
            dimension: 'corroboration',
            score,
            reason: `Corroborated by ${count} strategy/strategies (${score})`
        };
    }
}
export default NormalizedCorroborationRule;
