import { logger } from '../../config.mjs';
import featureFlags from '../execution/locatorIntelligence/FeatureFlags.mjs';

/**
 * Distributed Runtime Coordination Layer for Feature Flag Governance and Production Cutover.
 * Evaluates feature flags in < 0.01ms via in-memory caching, governs canary-to-production cutovers,
 * and broadcasts emergency atomic cluster rollbacks without process restart.
 */
export class FeatureFlagManager {
    constructor(initialConfig = {}) {
        this._cache = new Map();
        this._versionHash = '';
        featureFlags._onUpdate = () => this._rebuildCache();
        this.initialize(initialConfig);
    }

    /**
     * Initializes or re-initializes flag cache and underlying static registry.
     * @param {Object} config - Configuration overrides
     */
    initialize(config = {}) {
        const start = Date.now();
        // Update static singleton so any component relying on featureFlags directly is updated
        featureFlags.init(config);
        this._rebuildCache();
        const duration = Date.now() - start;
        logger.info(`[FeatureFlagManager] Initialized flags in ${duration}ms (Version Hash: ${this._versionHash})`);
    }

    /**
     * Rebuilds fast in-memory boolean/string cache from underlying registry and computes version hash.
     * @private
     */
    _rebuildCache() {
        this._cache.clear();
        const allFlags = featureFlags.getAll();
        const sortedKeys = Array.from(allFlags.keys()).sort();
        let hashString = '';

        for (const key of sortedKeys) {
            const val = allFlags.get(key);
            this._cache.set(key, val);
            hashString += `${key}=${val};`;
        }

        this._versionHash = this._computeHash(hashString);
    }

    /**
     * Computes a fast alphanumeric version hash for distributed drift detection in IPC heartbeats.
     * @param {string} str - Stringified sorted configuration
     * @returns {string} Hex hash
     * @private
     */
    _computeHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Evaluates whether a boolean feature flag is enabled. Uses fast in-memory map lookup (< 0.01ms).
     * @param {string} flagName - Name of the flag
     * @returns {boolean} True if enabled, false otherwise
     */
    isFlagEnabled(flagName) {
        const val = this._cache.get(flagName);
        if (val === undefined) return false;
        return Boolean(val);
    }

    /**
     * Returns the schema enforcement mode ('STRICT', 'SHADOW', or 'DISABLED').
     * @returns {'STRICT' | 'SHADOW' | 'DISABLED'}
     */
    getSchemaMode() {
        const val = this._cache.get('V3_SCHEMA_ENFORCEMENT_MODE');
        if (val === 'STRICT' || val === 'SHADOW' || val === 'DISABLED') {
            return val;
        }
        return 'DISABLED';
    }

    /**
     * Returns the raw cached value of a flag.
     * @param {string} flagName
     * @returns {any}
     */
    getFlag(flagName) {
        return this._cache.get(flagName);
    }

    /**
     * Returns the current configuration version hash for heartbeat stamping.
     * @returns {string}
     */
    getVersionHash() {
        return this._versionHash;
    }

    /**
     * Atomically updates configuration flags across the process runtime.
     * @param {Object} newConfig - Key-value map of flag updates
     */
    updateConfiguration(newConfig = {}) {
        const start = Date.now();
        const currentAll = Object.fromEntries(featureFlags.getAll());
        const merged = { ...currentAll, ...newConfig };
        
        featureFlags.init(merged);
        this._rebuildCache();
        
        const duration = Date.now() - start;
        logger.info(`[FeatureFlagManager] Dynamic configuration updated in ${duration}ms (New Version Hash: ${this._versionHash})`);
    }

    /**
     * Emergency cluster rollback broadcast.
     * Reverts all V3 resilient synchronization and advanced pipeline flags to disabled/V2 legacy defaults
     * within 50ms across the Node.js process without requiring process restart.
     */
    broadcastRollback() {
        const start = Date.now();
        logger.warn(`[FeatureFlagManager] EMERGENCY ROLLBACK BROADCAST RECEIVED. Reverting cluster node to legacy V2 paths.`);
        
        const rollbackConfig = {
            V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED',
            V3_DECOUPLE_HEALTH_MONITOR: false,
            V3_ENABLE_STANDBY_POOL: false,
            V3_ENABLE_GLOBAL_TTL: false,
            LI_EPOCH_GATING: false,
            LI_RECOVERY_HIERARCHY: false,
            LI_CONFIDENCE_GATE: false,
            LI_DISAMBIGUATION: false,
            LI_VERIFICATION: false,
            LI_BATCH_RESOLVER: false,
            LI_SERIALIZE_FEATURES: false,
            LI_IDENTITY_DOCUMENT: false,
            LI_EXTENDED_FEATURES: false
        };

        featureFlags.init(rollbackConfig);
        this._rebuildCache();

        const duration = Date.now() - start;
        logger.warn(`[FeatureFlagManager] Emergency rollback completed in ${duration}ms. Active Version Hash: ${this._versionHash}`);
        
        if (duration > 50) {
            logger.error(`[FeatureFlagManager] SLA Violation: Rollback took ${duration}ms (> 50ms threshold)`);
        }
    }
}

export const featureFlagManager = new FeatureFlagManager();
export default featureFlagManager;
