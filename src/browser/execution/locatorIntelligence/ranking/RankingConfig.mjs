import { BaseScoreRule } from './RankingRules/BaseScoreRule.mjs';
import { DynamicContentRule } from './RankingRules/DynamicContentRule.mjs';
import { ValidationConfidenceRule } from './RankingRules/ValidationConfidenceRule.mjs';
import { SpecificityRule } from './RankingRules/SpecificityRule.mjs';
import { ComplexityRule } from './RankingRules/ComplexityRule.mjs';
import { StructuralRule } from './RankingRules/StructuralRule.mjs';
import { VisibilityRule } from './RankingRules/VisibilityRule.mjs';
import { CorroborationRule } from './RankingRules/CorroborationRule.mjs';
import featureFlags from '../FeatureFlags.mjs';

export class RankingConfig {
    static getRules() {
        const removeValidator = featureFlags.isEnabled('LI_REMOVE_VALIDATOR');
        return [
            { rule: new BaseScoreRule(), enabled: true, priority: 100 },
            { rule: new DynamicContentRule(), enabled: true, priority: 90 },
            { rule: new ValidationConfidenceRule(), enabled: !removeValidator, priority: 80 },
            { rule: new SpecificityRule(), enabled: true, priority: 70 },
            { rule: new ComplexityRule(), enabled: true, priority: 60 },
            { rule: new StructuralRule(), enabled: true, priority: 50 },
            { rule: new VisibilityRule(), enabled: true, priority: 40 },
            { rule: new CorroborationRule(), enabled: true, priority: 30 }
        ];
    }
}
