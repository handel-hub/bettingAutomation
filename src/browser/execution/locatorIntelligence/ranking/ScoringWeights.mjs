export class ScoringWeights {
    constructor(overrides = {}) {
        const defaults = {
            strategyReliability: 0.30,
            structuralStability: 0.15,
            dynamicContentRisk: 0.15,
            specificity: 0.10,
            corroboration: 0.15,
            visibility: 0.05,
            contextSimilarity: 0.10
        };

        this._weights = { ...defaults, ...overrides };

        let sum = 0;
        for (const val of Object.values(this._weights)) {
            sum += Number(val) || 0;
        }

        if (Math.abs(sum - 1.0) > 0.001) {
            throw new Error(`[ScoringWeights] Dimension weights must sum to 1.0 (got ${sum.toFixed(4)})`);
        }
    }

    get(dimension) {
        return this._weights[dimension] !== undefined ? this._weights[dimension] : 0.0;
    }

    toMap() {
        return { ...this._weights };
    }
}
export default ScoringWeights;
