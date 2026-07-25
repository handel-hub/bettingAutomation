export class ConfidenceReport {
    constructor({
        decision = 'PENDING',
        confidence = 0.0,
        interactionType = 'click',
        thresholdApplied = 0.0,
        winningCandidate = null,
        allScores = [],
        reason = '',
        timestamp = Date.now()
    } = {}) {
        this.decision = decision; // 'ACCEPT' | 'REJECT' | 'TENTATIVE' | 'PENDING'
        this.confidence = this._clamp(confidence);
        this.interactionType = interactionType;
        this.thresholdApplied = Number(thresholdApplied) || 0.0;
        this.winningCandidate = winningCandidate ? (typeof winningCandidate === 'object' ? { ...winningCandidate } : winningCandidate) : null;
        this.allScores = Array.isArray(allScores) ? allScores.map(s => ({ ...s })) : [];
        this.reason = String(reason || '');
        this.timestamp = Number(timestamp) || Date.now();
    }

    _clamp(val) {
        const n = Number(val);
        if (isNaN(n)) return 0.0;
        return Math.max(0.0, Math.min(1.0, n));
    }

    isAcceptable() {
        return this.decision === 'ACCEPT' || this.decision === 'TENTATIVE';
    }

    serialize() {
        return {
            decision: this.decision,
            confidence: this.confidence,
            interactionType: this.interactionType,
            thresholdApplied: this.thresholdApplied,
            winningCandidate: this.winningCandidate ? (typeof this.winningCandidate === 'object' ? { ...this.winningCandidate } : this.winningCandidate) : null,
            allScores: this.allScores.map(s => ({ ...s })),
            reason: this.reason,
            timestamp: this.timestamp
        };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            return new ConfidenceReport();
        }
        return new ConfidenceReport(data);
    }
}
export default ConfidenceReport;
