export class ScoringVector {
    constructor(dimensions = {}, weights = null, breakdown = {}) {
        this.dimensions = {
            uniqueness: this._clamp(dimensions.uniqueness || 0),
            stability: this._clamp(dimensions.stability || 0),
            resilience: this._clamp(dimensions.resilience || 0),
            performance: this._clamp(dimensions.performance || 0),
            specificity: this._clamp(dimensions.specificity || 0)
        };

        this.weights = weights ? { ...weights } : ScoringVector.getDefaultWeights();
        this.breakdown = { ...breakdown };
        this.aggregateScore = 0.0;
        this.recalculate();
    }

    static getDefaultWeights() {
        return {
            uniqueness: 0.35,
            stability: 0.25,
            resilience: 0.20,
            performance: 0.10,
            specificity: 0.10
        };
    }

    _clamp(val) {
        const n = Number(val);
        if (isNaN(n)) return 0;
        return Math.max(0.0, Math.min(1.0, n));
    }

    setDimension(name, score, ruleName = '', explanation = '') {
        if (!(name in this.dimensions)) {
            return;
        }
        this.dimensions[name] = this._clamp(score);
        if (ruleName) {
            this.breakdown[`${name}:${ruleName}`] = {
                action: 'SET',
                value: this.dimensions[name],
                explanation: explanation || `Set ${name} to ${this.dimensions[name]}`
            };
        }
        this.recalculate();
    }

    addBonus(dimension, amount, ruleName = '', explanation = '') {
        if (!(dimension in this.dimensions)) {
            return;
        }
        const prev = this.dimensions[dimension];
        this.dimensions[dimension] = this._clamp(prev + amount);
        if (ruleName) {
            this.breakdown[`${dimension}:${ruleName}`] = {
                action: 'BONUS',
                amount,
                previous: prev,
                current: this.dimensions[dimension],
                explanation: explanation || `Added bonus +${amount} to ${dimension}`
            };
        }
        this.recalculate();
    }

    applyPenalty(dimension, amount, ruleName = '', explanation = '') {
        if (!(dimension in this.dimensions)) {
            return;
        }
        const prev = this.dimensions[dimension];
        this.dimensions[dimension] = this._clamp(prev - amount);
        if (ruleName) {
            this.breakdown[`${dimension}:${ruleName}`] = {
                action: 'PENALTY',
                amount,
                previous: prev,
                current: this.dimensions[dimension],
                explanation: explanation || `Applied penalty -${amount} to ${dimension}`
            };
        }
        this.recalculate();
    }

    recalculate() {
        let total = 0.0;
        let weightSum = 0.0;
        for (const [dim, weight] of Object.entries(this.weights)) {
            const val = this.dimensions[dim] || 0.0;
            total += val * weight;
            weightSum += weight;
        }
        // Normalize if weights don't sum to exactly 1.0
        const rawScore = weightSum > 0 ? total / weightSum : 0.0;
        this.aggregateScore = Number(this._clamp(rawScore).toFixed(4));
        return this.aggregateScore;
    }

    serialize() {
        return {
            dimensions: { ...this.dimensions },
            weights: { ...this.weights },
            aggregateScore: this.aggregateScore,
            breakdown: { ...this.breakdown }
        };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            return new ScoringVector();
        }
        const vec = new ScoringVector(data.dimensions, data.weights, data.breakdown);
        if (data.aggregateScore !== undefined) {
            vec.aggregateScore = Number(data.aggregateScore);
        }
        return vec;
    }
}
export default ScoringVector;
