export class ConsistencyEvaluator {
    constructor(policy) {
        this.policy = policy;
    }

    evaluate(capabilityStates) {
        let score = 0;
        let maxScore = 0;
        
        for (const [cap, weight] of Object.entries(this.policy.weights)) {
            maxScore += weight;
            if (capabilityStates[cap] === true) {
                score += weight;
            }
        }

        if (maxScore === 0) return 100;
        return (score / maxScore) * 100;
    }
}
