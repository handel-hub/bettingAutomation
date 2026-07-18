export class BaseScoreRule extends RankingRule {
    constructor() {
        super('BaseScoreRule');
    }

    evaluate(candidate, context) {
        let base = 0;
        switch (candidate.strategy) {
            case 'DataAttributeStrategy': base = 100; break;
            case 'RoleStrategy': base = 80; break;
            case 'AriaStrategy': base = 70; break;
            case 'TextStrategy': base = 60; break;
            case 'SemanticClassStrategy': base = 50; break;
            case 'StructuralStrategy': base = 30; break;
            default: base = 10; break;
        }
        return { baseScore: base };
    }
}
