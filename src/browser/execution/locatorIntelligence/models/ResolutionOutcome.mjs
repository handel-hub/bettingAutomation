export class ResolutionOutcome {
    constructor({
        success = false,
        status = 'PENDING',
        playwrightLocator = null,
        winningCandidate = null,
        confidenceReport = null,
        similarityScore = null,
        recoveryLevel = 'L0_DIRECT',
        durationMs = 0,
        attempts = 0,
        error = null,
        telemetry = []
    } = {}) {
        this.success = Boolean(success);
        this.status = status; // 'RESOLVED' | 'REJECTED' | 'EXHAUSTED' | 'TIMEOUT' | 'ERROR' | 'SKIPPED'
        this.playwrightLocator = playwrightLocator;
        this.winningCandidate = winningCandidate ? (typeof winningCandidate === 'object' ? { ...winningCandidate } : winningCandidate) : null;
        this.confidenceReport = confidenceReport;
        this.similarityScore = similarityScore;
        this.recoveryLevel = recoveryLevel;
        this.durationMs = Number(durationMs) || 0;
        this.attempts = Number(attempts) || 0;
        this.error = error;
        this.telemetry = Array.isArray(telemetry) ? [...telemetry] : [];
    }

    isSuccess() {
        return this.success === true && this.status === 'RESOLVED';
    }

    serialize() {
        return {
            success: this.success,
            status: this.status,
            winningCandidate: this.winningCandidate ? (typeof this.winningCandidate === 'object' ? { ...this.winningCandidate } : this.winningCandidate) : null,
            confidenceReport: this.confidenceReport && typeof this.confidenceReport.serialize === 'function' ? this.confidenceReport.serialize() : (this.confidenceReport ? { ...this.confidenceReport } : null),
            similarityScore: this.similarityScore && typeof this.similarityScore.serialize === 'function' ? this.similarityScore.serialize() : (this.similarityScore ? { ...this.similarityScore } : null),
            recoveryLevel: this.recoveryLevel,
            durationMs: this.durationMs,
            attempts: this.attempts,
            error: this.error ? (this.error.code ? `[${this.error.code}] ${this.error.message}` : String(this.error.message || this.error)) : null,
            telemetry: this.telemetry.map(t => (t && typeof t.serialize === 'function' ? t.serialize() : { ...t }))
        };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            return new ResolutionOutcome();
        }
        return new ResolutionOutcome(data);
    }
}
export default ResolutionOutcome;
