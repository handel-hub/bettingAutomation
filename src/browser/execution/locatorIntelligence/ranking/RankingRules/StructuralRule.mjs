export class StructuralRule extends RankingRule {
    constructor() {
        super('StructuralRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        const score = candidate.structural?.score;
        
        if (score === 'HIGH') multiplier = 1.0;
        else if (score === 'MEDIUM') multiplier = 0.9;
        else if (score === 'LOW') multiplier = 0.5;
        
        return { multiplier };
    }
}
