export class MemoryPolicyProvider {
    constructor(policy) {
        this.policy = policy || {};
    }

    getPolicy() {
        return this.policy;
    }

    updatePolicy(category, values) {
        if (category) {
            this.policy[category] = { ...this.policy[category], ...values };
        } else if (values && typeof values === 'object') {
            Object.assign(this.policy, values);
        }
    }
}
