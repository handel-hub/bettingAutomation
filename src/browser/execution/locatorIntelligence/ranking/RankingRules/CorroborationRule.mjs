export class CorroborationRule extends RankingRule {
    constructor() {
        super('CorroborationRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        const count = candidate.generatedBy ? candidate.generatedBy.length : 1;
        
        if (count === 1) multiplier = 1.0;
        else if (count === 2) multiplier = 1.1;
        else if (count >= 3) multiplier = 1.15; // Diminishing returns
        
        return { multiplier };
    }
}
