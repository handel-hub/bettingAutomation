// @ts-check

/**
 * MemoryPolicyProvider
 * 
 * In-memory policy provider supporting:
 * - Default template policy with account-specific overrides
 * - Targeted runtime updates (single account)
 * - Cluster-wide runtime updates (all accounts)
 * - Alias mapping between browser slot IDs (e.g. 'slave_0') and account usernames
 */
export class MemoryPolicyProvider {
    /**
     * @param {Object} [initialPolicy] - Either a single policy object or { defaultPolicy, accountPolicies }
     */
    constructor(initialPolicy = {}) {
        /** @type {Map<string, Object>} */
        this.accountPolicies = new Map();
        /** @type {Map<string, string>} */
        this.aliases = new Map();

        const deepClone = (obj) => (obj ? JSON.parse(JSON.stringify(obj)) : {});

        if (initialPolicy && (initialPolicy.defaultPolicy || initialPolicy.accountPolicies)) {
            this.defaultPolicy = deepClone(initialPolicy.defaultPolicy || {});
            if (initialPolicy.accountPolicies) {
                if (initialPolicy.accountPolicies instanceof Map) {
                    for (const [id, pol] of initialPolicy.accountPolicies.entries()) {
                        this.accountPolicies.set(String(id), deepClone(pol));
                    }
                } else if (typeof initialPolicy.accountPolicies === 'object') {
                    for (const [id, pol] of Object.entries(initialPolicy.accountPolicies)) {
                        this.accountPolicies.set(String(id), deepClone(pol));
                    }
                }
            }
        } else {
            this.defaultPolicy = deepClone(initialPolicy);
        }
    }

    /**
     * Backward-compatibility accessor for the baseline default policy.
     */
    get policy() {
        return this.defaultPolicy;
    }

    set policy(val) {
        this.defaultPolicy = val || {};
    }

    /**
     * Registers an alias linking an alternate identifier (e.g. browserId 'slave_0')
     * to a canonical account ID (e.g. username '08107992381').
     * @param {string} aliasId 
     * @param {string} canonicalId 
     */
    addAlias(aliasId, canonicalId) {
        if (aliasId && canonicalId) {
            this.aliases.set(String(aliasId), String(canonicalId));
        }
    }

    /**
     * Resolves an identifier through registered aliases.
     * @param {string} id 
     * @returns {string}
     * @private
     */
    _resolveId(id) {
        const strId = String(id);
        return this.aliases.get(strId) || strId;
    }

    /**
     * Resolves the active policy for an account or browser context.
     * Falls back to defaultPolicy if no account-specific policy exists.
     * 
     * @param {string} [accountId] - The account username or browser slot ID
     * @returns {Object} The resolved policy object
     */
    getPolicy(accountId) {
        if (accountId !== undefined && accountId !== null) {
            const resolvedId = this._resolveId(accountId);
            if (this.accountPolicies.has(resolvedId)) {
                return this.accountPolicies.get(resolvedId);
            }
            const rawId = String(accountId);
            if (this.accountPolicies.has(rawId)) {
                return this.accountPolicies.get(rawId);
            }
        }
        return this.defaultPolicy;
    }

    /**
     * Sets or replaces an account-specific policy.
     * @param {string} accountId 
     * @param {Object} policyObject 
     */
    setPolicy(accountId, policyObject) {
        if (!accountId || !policyObject) return;
        const resolvedId = this._resolveId(accountId);
        const cloned = JSON.parse(JSON.stringify(policyObject));
        this.accountPolicies.set(resolvedId, cloned);
    }

    /**
     * Recursively deep-merges source object into target object.
     * @param {Object} target 
     * @param {Object} source 
     * @returns {Object}
     * @private
     */
    _deepMerge(target, source) {
        if (!source || typeof source !== 'object') return target;
        for (const key of Object.keys(source)) {
            const val = source[key];
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this._deepMerge(target[key], val);
            } else {
                target[key] = val;
            }
        }
        return target;
    }

    /**
     * Mutates an object section safely using recursive deep merge.
     * @param {Object} targetObj 
     * @param {string|null} category 
     * @param {Object} values 
     * @private
     */
    _merge(targetObj, category, values) {
        if (!values || typeof values !== 'object') return;

        if (category) {
            if (!targetObj[category] || typeof targetObj[category] !== 'object') {
                targetObj[category] = {};
            }
            this._deepMerge(targetObj[category], values);
        } else {
            this._deepMerge(targetObj, values);
        }
    }

    /**
     * Updates policy values using an explicit command options object.
     * 
     * @param {Object} [options]
     * @param {string} [options.target='ALL'] - 'ALL' or specific accountId/slotId
     * @param {string|null} [options.category=null] - Policy section to update (e.g. 'Pricing')
     * @param {Object} [options.values=null] - Key-value overrides to deep-merge
     */
    updatePolicy({ target = 'ALL', category = null, values = null } = {}) {
        if (!values || typeof values !== 'object') return;

        const effectiveTarget = target ? String(target) : 'ALL';

        if (effectiveTarget === 'ALL' || effectiveTarget === '*') {
            // Cluster-wide update: update default template and all active account policies
            this._merge(this.defaultPolicy, category, values);
            for (const accountPolicy of this.accountPolicies.values()) {
                this._merge(accountPolicy, category, values);
            }
        } else {
            // Targeted update: update specific account entry (clone default if first override)
            const resolvedId = this._resolveId(effectiveTarget);
            if (!this.accountPolicies.has(resolvedId)) {
                const clonedDefault = JSON.parse(JSON.stringify(this.defaultPolicy));
                this.accountPolicies.set(resolvedId, clonedDefault);
            }
            this._merge(this.accountPolicies.get(resolvedId), category, values);
        }
    }
}
