export class ValidationResult {
    constructor({ status = 'PENDING', matchCount = 0, errors = [], duration = 0, method = 'none' } = {}) {
        this.status = status; // UNIQUE, AMBIGUOUS, MISSING, INVALID, NOT_VERIFIABLE
        this.matchCount = matchCount;
        this.errors = errors;
        this.duration = duration;
        this.method = method; // CSS, XPath, Native, Unsupported
    }
}
