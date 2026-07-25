import { RankingRule } from '../RankingRule.mjs';

class NormalizedUUIDDetector {
    static detect(str) {
        return /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(str) ? 30 : 0;
    }
}

class NormalizedTimestampDetector {
    static detect(str) {
        return (/\d{1,2}:\d{2}/.test(str) || /\d{4}-\d{2}-\d{2}/.test(str)) ? 20 : 0;
    }
}

class NormalizedFrameworkHashDetector {
    static detect(str) {
        return (/-[0-9]{3,}$|_[0-9]{3,}$/.test(str)) ? 20 : 0;
    }
}

class NormalizedHexBase64Detector {
    static detect(str) {
        return (/[0-9a-zA-Z\-_]{16,}/.test(str) && !str.includes(' ')) ? 15 : 0;
    }
}

class NormalizedCurrencyDetector {
    static detect(str) {
        return (/^\$?\d+\.\d{2}$/.test(str.trim())) ? 5 : 0;
    }
}

export class NormalizedDynamicContentRule extends RankingRule {
    constructor() {
        super('NormalizedDynamicContentRule');
        this.detectors = [
            NormalizedUUIDDetector,
            NormalizedTimestampDetector,
            NormalizedFrameworkHashDetector,
            NormalizedHexBase64Detector,
            NormalizedCurrencyDetector
        ];
    }

    evaluate(candidate, context) {
        let penaltyScore = 0;
        
        const loc = candidate.locator || '';
        const features = candidate.features || {};
        
        const stringsToTest = [
            loc,
            features.id || '',
            features.className || '',
            features.text || ''
        ];
        
        for (const str of stringsToTest) {
            if (!str) continue;
            for (const detector of this.detectors) {
                penaltyScore += detector.detect(str);
            }
        }
        
        let score = 1.0;
        if (penaltyScore >= 30) score = 0.2;
        else if (penaltyScore >= 20) score = 0.4;
        else if (penaltyScore >= 15) score = 0.6;
        else if (penaltyScore >= 10) score = 0.8;
        else if (penaltyScore >= 5) score = 0.9;
        
        return {
            dimension: 'dynamicContentRisk',
            score,
            reason: `Dynamic content penalty score ${penaltyScore} mapped to inverted risk ${score}`
        };
    }
}
export default NormalizedDynamicContentRule;
