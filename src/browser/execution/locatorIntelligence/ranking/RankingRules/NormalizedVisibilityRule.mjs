import { RankingRule } from '../RankingRule.mjs';

export class NormalizedVisibilityRule extends RankingRule {
    constructor() {
        super('NormalizedVisibilityRule');
    }

    evaluate(candidate, context) {
        let score = 1.0;
        if (candidate.features && candidate.features.isIntersecting === false) {
            score = 0.5;
        }
        
        return {
            dimension: 'visibility',
            score,
            reason: `Element visibility is ${score === 1.0 ? 'visible' : 'hidden'} (${score})`
        };
    }
}
export default NormalizedVisibilityRule;
