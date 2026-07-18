export class ValidationConfidenceRule extends RankingRule {
    constructor() {
        super('ValidationConfidenceRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        const status = candidate.validation?.status;
        
        if (status === 'UNIQUE') multiplier = 1.0;
        else if (status === 'AMBIGUOUS') multiplier = 0.2;
        else if (status === 'MISSING') multiplier = 0.0;
        else if (status === 'NOT_VERIFIABLE') multiplier = 0.8;
        else if (status === 'INVALID') multiplier = 0.0;
        
        return { multiplier };
    }
}
