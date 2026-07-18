class UUIDDetector {
    static detect(str) {
        return /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(str) ? 30 : 0;
    }
}

class TimestampDetector {
    static detect(str) {
        return (/\d{1,2}:\d{2}/.test(str) || /\d{4}-\d{2}-\d{2}/.test(str)) ? 20 : 0;
    }
}

class FrameworkHashDetector {
    static detect(str) {
        return (/-[0-9]{3,}$|_[0-9]{3,}$/.test(str)) ? 20 : 0;
    }
}

class HexBase64Detector {
    static detect(str) {
        return (/[0-9a-zA-Z\-_]{16,}/.test(str) && !str.includes(' ')) ? 15 : 0;
    }
}

class CurrencyDetector {
    static detect(str) {
        return (/^\$?\d+\.\d{2}$/.test(str.trim())) ? 5 : 0;
    }
}

export class DynamicContentRule extends RankingRule {
    constructor() {
        super('DynamicContentRule');
        this.detectors = [
            UUIDDetector,
            TimestampDetector,
            FrameworkHashDetector,
            HexBase64Detector,
            CurrencyDetector
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
        
        // Cap penalty score and convert to multiplier
        let multiplier = 1.0;
        if (penaltyScore >= 30) multiplier = 0.2;
        else if (penaltyScore >= 20) multiplier = 0.4;
        else if (penaltyScore >= 15) multiplier = 0.6;
        else if (penaltyScore >= 10) multiplier = 0.8;
        else if (penaltyScore >= 5) multiplier = 0.9;
        
        return { multiplier };
    }
}
