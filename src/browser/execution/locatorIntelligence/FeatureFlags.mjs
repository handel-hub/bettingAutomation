export class FeatureFlagsRegistry {
    constructor() {
        this._flags = new Map();
        this._initialized = false;
        this.definitions = {
            LI_EXTENDED_FEATURES: { default: true, dependsOn: [], description: 'Enable extended feature extraction' },
            LI_IDENTITY_DOCUMENT: { default: true, dependsOn: ['LI_EXTENDED_FEATURES'], description: 'Enable EID generation and transmission' },
            LI_SERIALIZE_FEATURES: { default: true, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Include features/EID in serialized output' },
            LI_EPOCH_GATING: { default: true, dependsOn: [], description: 'Enable navigation epoch checks' },
            LI_BATCH_RESOLVER: { default: true, dependsOn: ['LI_SERIALIZE_FEATURES'], description: 'Use batch resolution via page.evaluate' },
            LI_DISAMBIGUATION: { default: true, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Enable disambiguation engine for count>1' },
            LI_VERIFICATION: { default: true, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Enable post-resolution EID verification' },
            LI_CONFIDENCE_GATE: { default: true, dependsOn: ['LI_VERIFICATION', 'LI_DISAMBIGUATION'], description: 'Enable threshold-based execution gating' },
            LI_RECOVERY_HIERARCHY: { default: true, dependsOn: ['LI_CONFIDENCE_GATE'], description: 'Use tiered recovery instead of flat retry' },
            LI_SID_MODE: { default: true, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Use SID-based cross-machine contract instead of locator strings' },
            V3_SCHEMA_ENFORCEMENT_MODE: { default: 'STRICT', dependsOn: [], description: 'Schema enforcement mode: DISABLED, SHADOW, or STRICT' },
            V3_DECOUPLE_HEALTH_MONITOR: { default: true, dependsOn: [], description: 'Decouple HealthMonitor from command execution failure state' },
            V3_ENABLE_STANDBY_POOL: { default: false, dependsOn: [], description: 'Enable WARM_STANDBY browser failover pool' },
            V3_ENABLE_GLOBAL_TTL: { default: true, dependsOn: [], description: 'Enable 1,500ms global distributed deadline budgeting' },
            FEATURE_TRACE_CDP_NETWORK: { default: true, dependsOn: [], description: 'Enable verbose CDP network interception for Playwright' },
            V4_SPATIAL_SCROLL: { default: true, dependsOn: [], description: 'Enable V4 spatial scroll feature flag for deterministic latest-wins coalescing' }
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
