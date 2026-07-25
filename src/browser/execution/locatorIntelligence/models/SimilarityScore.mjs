export class SimilarityScore {
    constructor(dimensions = {}, weights = null, rejectionReasons = []) {
        this.dimensions = {
            tagMatch: this._clamp(dimensions.tagMatch || 0),
            idMatch: this._clamp(dimensions.idMatch || 0),
            classMatch: this._clamp(dimensions.classMatch || 0),
            attributeMatch: this._clamp(dimensions.attributeMatch || 0),
            textMatch: this._clamp(dimensions.textMatch || 0),
            hierarchyMatch: this._clamp(dimensions.hierarchyMatch || 0),
            semanticMatch: this._clamp(dimensions.semanticMatch || 0),
            positionMatch: this._clamp(dimensions.positionMatch || 0)
        };

        this.weights = weights ? { ...weights } : SimilarityScore.getDefaultWeights();
        this.rejectionReasons = Array.isArray(rejectionReasons) ? [...rejectionReasons] : [];
        this.overallScore = 0.0;
        this.recalculate();
    }

    static getDefaultWeights() {
        return {
            tagMatch: 0.20,
            idMatch: 0.20,
            textMatch: 0.20,
            classMatch: 0.10,
            attributeMatch: 0.10,
            hierarchyMatch: 0.10,
            semanticMatch: 0.05,
            positionMatch: 0.05
        };
    }

    _clamp(val) {
        const n = Number(val);
        if (isNaN(n)) return 0;
        return Math.max(0.0, Math.min(1.0, n));
    }

    recalculate() {
        if (this.rejectionReasons.length > 0) {
            this.overallScore = 0.0;
            return 0.0;
        }

        let total = 0.0;
        let weightSum = 0.0;
        for (const [dim, weight] of Object.entries(this.weights)) {
            const val = this.dimensions[dim] || 0.0;
            total += val * weight;
            weightSum += weight;
        }

        const rawScore = weightSum > 0 ? total / weightSum : 0.0;
        this.overallScore = Number(this._clamp(rawScore).toFixed(4));
        return this.overallScore;
    }

    addRejectionReason(reason) {
        if (reason && !this.rejectionReasons.includes(reason)) {
            this.rejectionReasons.push(String(reason));
        }
        this.overallScore = 0.0;
        return 0.0;
    }

    isMatch(threshold = 0.50) {
        return this.rejectionReasons.length === 0 && this.overallScore >= threshold;
    }

    serialize() {
        return {
            dimensions: { ...this.dimensions },
            weights: { ...this.weights },
            rejectionReasons: [...this.rejectionReasons],
            overallScore: this.overallScore
        };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            return new SimilarityScore();
        }
        const score = new SimilarityScore(data.dimensions, data.weights, data.rejectionReasons);
        if (data.overallScore !== undefined && score.rejectionReasons.length === 0) {
            score.overallScore = Number(data.overallScore);
        }
        return score;
    }
}
export default SimilarityScore;
