export class ResolutionPolicy {
    constructor(config = {}) {
        this.limits = {
            globalTimeoutMs: config.limits?.globalTimeoutMs ?? 2500,
            retryIntervalMs: config.limits?.retryIntervalMs ?? 50,
            maxCandidates: config.limits?.maxCandidates ?? 5
        };
        
        this.retry = {
            budgetTiers: config.retry?.budgetTiers ?? [
                { minScore: 95, retries: 8 },
                { minScore: 80, retries: 5 },
                { minScore: 60, retries: 3 },
                { minScore: 40, retries: 2 },
                { minScore: 0, retries: 1 }
            ],
            decayMultiplier: config.retry?.decayMultiplier ?? 0.9,
            minConfidenceClamp: config.retry?.minConfidenceClamp ?? 5,
            retryableFailures: config.retry?.retryableFailures ?? ['NotAttachedError', 'HiddenError', 'DisabledError', 'AmbiguousMatchError']
        };
        
        this.telemetry = {
            debug: config.telemetry?.debug ?? false,
            captureHistory: config.telemetry?.captureHistory ?? true
        };
    }

    getRetryBudget(score) {
        for (const tier of this.retry.budgetTiers) {
            if (score >= tier.minScore) {
                return tier.retries;
            }
        }
        return 1;
    }
}

export const DefaultPolicy = new ResolutionPolicy();
