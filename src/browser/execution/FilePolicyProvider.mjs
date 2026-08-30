import { StrategyPolicyLoader } from './StrategyPolicyLoader.mjs';

/**
 * FilePolicyProvider
 * Implements the PolicyManager boundary contract using the local filesystem.
 * This class ensures that downstream calculation and execution components
 * remain agnostic to the configuration source.
 */
export class FilePolicyProvider {
    /**
     * Resolves the policy for a given account.
     * Currently returns a globally shared strategy from betting_strategy.ini,
     * but maintains the account-aware signature for future control plane migration.
     * 
     * @param {string} accountId - The ID of the account/browser
     * @returns {Object} The normalized policy object
     */
    getPolicy(accountId) {
        // In the future, this might fetch account-specific policies from an API/DB.
        // For now, it proxies to the global filesystem loader to maintain determinism.
        return StrategyPolicyLoader.loadPolicy();
    }
}
