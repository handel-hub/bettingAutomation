export class RecoveryPlan {
    constructor({ strategy, targets = [], reason = '', maxAttempts = 1, escalateTo = null }) {
        this.strategy = strategy;
        this.targets = targets;
        this.reason = reason;
        this.maxAttempts = maxAttempts;
        this.escalateTo = escalateTo;
    }
}
