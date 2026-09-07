export class MemoryPolicyProvider {
    constructor(policy) {
        this.policy = policy;
    }

    getPolicy() {
        return this.policy;
    }
}
