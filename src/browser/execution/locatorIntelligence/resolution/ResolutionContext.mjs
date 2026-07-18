export const ResolutionState = {
    PENDING: 'PENDING',
    VALIDATING: 'VALIDATING',
    LOCATED: 'LOCATED',
    VISIBLE: 'VISIBLE',
    ACTIONABLE: 'ACTIONABLE',
    RESOLVED: 'RESOLVED',
    RETRYABLE_FAILURE: 'RETRYABLE_FAILURE',
    TERMINAL_FAILURE: 'TERMINAL_FAILURE',
    EXHAUSTED: 'EXHAUSTED'
};

export class ResolutionContext {
    constructor(candidate, policy) {
        this.candidate = candidate;
        this.policy = policy;
        this.baseConfidence = candidate.ranking?.finalScore || 50;
        this.currentConfidence = this.baseConfidence;
        this.confidenceEvolution = [this.baseConfidence];
        
        this.attempts = 0;
        this.retryBudget = policy.getRetryBudget(this.baseConfidence);
        
        this.state = ResolutionState.PENDING;
        this.stateEnteredAt = Date.now();
        this.firstAttemptAt = null;
        this.lastAttemptAt = null;
        
        this.stateHistory = [{ state: this.state, timestamp: this.stateEnteredAt }];
        this.failureHistory = [];
        this.lastFailure = null;
    }

    transitionTo(newState) {
        this.state = newState;
        this.stateEnteredAt = Date.now();
        this.stateHistory.push({ state: this.state, timestamp: this.stateEnteredAt });
    }

    recordAttempt() {
        if (!this.firstAttemptAt) {
            this.firstAttemptAt = Date.now();
        }
        this.lastAttemptAt = Date.now();
        this.attempts++;
    }

    recordFailure(error, isTerminal) {
        this.lastFailure = error;
        this.failureHistory.push({
            error: error.message || error.toString(),
            code: error.code || 'UNKNOWN',
            name: error.name || 'Error',
            timestamp: Date.now()
        });

        if (isTerminal) {
            this.transitionTo(ResolutionState.TERMINAL_FAILURE);
        } else {
            this.currentConfidence = Math.max(
                this.policy.retry.minConfidenceClamp, 
                this.currentConfidence * this.policy.retry.decayMultiplier
            );
            this.confidenceEvolution.push(Number(this.currentConfidence.toFixed(1)));
            
            if (this.attempts >= this.retryBudget) {
                this.transitionTo(ResolutionState.EXHAUSTED);
            } else {
                this.transitionTo(ResolutionState.RETRYABLE_FAILURE);
            }
        }
    }

    isActive() {
        return this.state !== ResolutionState.EXHAUSTED && 
               this.state !== ResolutionState.TERMINAL_FAILURE && 
               this.state !== ResolutionState.RESOLVED;
    }
}
