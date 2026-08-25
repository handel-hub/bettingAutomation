export class FeatureFlagsRegistry {
    constructor() {
        this._flags = new Map();
        this._initialized = false;
        this.definitions = {
            V3_SCHEMA_ENFORCEMENT_MODE: { default: 'STRICT', dependsOn: [], description: 'Schema enforcement mode: DISABLED, SHADOW, or STRICT' },
            V3_DECOUPLE_HEALTH_MONITOR: { default: true, dependsOn: [], description: 'Decouple HealthMonitor from command execution failure state' },
            V3_ENABLE_STANDBY_POOL: { default: false, dependsOn: [], description: 'Enable WARM_STANDBY browser failover pool' },
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
