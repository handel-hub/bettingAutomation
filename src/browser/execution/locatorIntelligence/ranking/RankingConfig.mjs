export class RankingConfig {
    static getRules() {
        return [
            { rule: new BaseScoreRule(), enabled: true, priority: 100 },
            { rule: new DynamicContentRule(), enabled: true, priority: 90 },
            { rule: new ValidationConfidenceRule(), enabled: true, priority: 80 },
            { rule: new SpecificityRule(), enabled: true, priority: 70 },
            { rule: new ComplexityRule(), enabled: true, priority: 60 },
            { rule: new StructuralRule(), enabled: true, priority: 50 },
            { rule: new VisibilityRule(), enabled: true, priority: 40 },
            { rule: new CorroborationRule(), enabled: true, priority: 30 }
        ];
    }
}
