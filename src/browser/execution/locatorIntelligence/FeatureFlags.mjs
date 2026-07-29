export class FeatureFlagsRegistry {
    constructor() {
        this._flags = new Map();
        this._initialized = false;
        this.definitions = {
            LI_EXTENDED_FEATURES: { default: false, dependsOn: [], description: 'Enable extended feature extraction' },
            LI_IDENTITY_DOCUMENT: { default: false, dependsOn: ['LI_EXTENDED_FEATURES'], description: 'Enable EID generation and transmission' },
            LI_ADDITIVE_SCORING: { default: false, dependsOn: [], description: 'Use additive vector scoring model' },
            LI_SERIALIZE_FEATURES: { default: false, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Include features/EID in serialized output' },
            LI_EPOCH_GATING: { default: false, dependsOn: [], description: 'Enable navigation epoch checks' },
            LI_BATCH_RESOLVER: { default: false, dependsOn: ['LI_SERIALIZE_FEATURES'], description: 'Use batch resolution via page.evaluate' },
            LI_DISAMBIGUATION: { default: false, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Enable disambiguation engine for count>1' },
            LI_VERIFICATION: { default: false, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Enable post-resolution EID verification' },
            LI_CONFIDENCE_GATE: { default: false, dependsOn: ['LI_VERIFICATION', 'LI_DISAMBIGUATION'], description: 'Enable threshold-based execution gating' },
            LI_RECOVERY_HIERARCHY: { default: false, dependsOn: ['LI_CONFIDENCE_GATE'], description: 'Use tiered recovery instead of flat retry' },
            LI_RESOLUTION_MEMORY: { default: false, dependsOn: ['LI_VERIFICATION'], description: 'Enable resolution caching' },
            LI_SHADOW_MODE: { default: false, dependsOn: [], description: 'Run new pipeline in parallel with legacy for comparison' },
            V3_SCHEMA_ENFORCEMENT_MODE: { default: 'STRICT', dependsOn: [], description: 'Schema enforcement mode: DISABLED, SHADOW, or STRICT' },
            V3_DECOUPLE_HEALTH_MONITOR: { default: true, dependsOn: [], description: 'Decouple HealthMonitor from command execution failure state' },
            V3_ENABLE_STANDBY_POOL: { default: false, dependsOn: [], description: 'Enable WARM_STANDBY browser failover pool' },
            V3_ENABLE_GLOBAL_TTL: { default: false, dependsOn: [], description: 'Enable 1,500ms global distributed deadline budgeting' },
            SCENE_GRAPH_ENABLED: { default: false, dependsOn: [], description: 'Enable Scene Graph indexing and query planner in Slave browser' },
            INFERENCE_ENGINE_V2: { default: false, dependsOn: [], description: 'Route resolution through multiplicative InferenceEngine' },
            LI_INFERENCE_ENGINE_V2: { default: false, dependsOn: [], description: 'Route resolution through multiplicative InferenceEngine (alias)' },
            enableSportyBetConfirmationClassifier: { default: false, dependsOn: [], description: 'V1 Technical Debt: Enable SportyBet specific classification for confirmations' }
        };
        this.init();
    }

    init(overrides = {}) {
        const newFlags = new Map();
        
        // Load raw values from overrides, then process.env, then defaults
        for (const [name, def] of Object.entries(this.definitions)) {
            let val = def.default;
            if (name in overrides) {
                val = typeof def.default === 'boolean' ? Boolean(overrides[name]) : overrides[name];
            } else if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
                val = typeof def.default === 'boolean' ? (process.env[name] === 'true' || process.env[name] === '1') : process.env[name];
            }
            newFlags.set(name, val);
        }

        // Validate dependencies iteratively
        let changed = true;
        while (changed) {
            changed = false;
            for (const [name, def] of Object.entries(this.definitions)) {
                if (Boolean(newFlags.get(name)) && def.dependsOn && def.dependsOn.length > 0) {
                    for (const dep of def.dependsOn) {
                        if (!newFlags.get(dep)) {
                            if (typeof console !== 'undefined' && console.warn) {
                                console.warn(`[FeatureFlags] Disabling ${name} because dependency ${dep} is disabled.`);
                            }
                            newFlags.set(name, typeof def.default === 'boolean' ? false : 'DISABLED');
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }

        this._flags = newFlags;
        this._initialized = true;
        if (this._onUpdate) {
            try { this._onUpdate(); } catch (e) {}
        }
    }

    isEnabled(flagName) {
        if (!this._flags.has(flagName)) {
            return false;
        }
        return Boolean(this._flags.get(flagName));
    }

    get(flagName) {
        if (!this._flags.has(flagName)) {
            return undefined;
        }
        return this._flags.get(flagName);
    }

    getAll() {
        return new Map(this._flags);
    }

    resetForTesting(overrides = {}) {
        this.init(overrides);
    }
}

export const featureFlags = new FeatureFlagsRegistry();
export default featureFlags;
