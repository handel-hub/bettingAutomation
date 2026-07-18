export class VisibilityRule extends RankingRule {
    constructor() {
        super('VisibilityRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        
        // Visibility heuristic: extracted from features.isIntersecting
        if (candidate.features && candidate.features.isIntersecting === false) {
            multiplier = 0.5; // Penalty for hidden elements
        }
        
        return { multiplier };
    }
}
