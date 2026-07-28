export class HybridLogicalClock {
    /**
     * @param {number} physical - physical timestamp in milliseconds (e.g. performance.timeOrigin + performance.now())
     * @param {number} logical - logical counter for resolving collisions within the same physical millisecond
     */
    constructor(physical, logical) {
        this.physical = physical;
        this.logical = logical;
        Object.freeze(this);
    }

    /**
     * Generates a new HLC. If lastHlc is provided, ensures the new HLC is strictly greater.
     * @param {HybridLogicalClock|null} lastHlc 
     * @returns {HybridLogicalClock}
     */
    static generate(lastHlc = null) {
        // High resolution timestamp. Math.floor is not strictly necessary but ensures deterministic comparison.
        // We keep it as a float to preserve sub-millisecond precision, if available.
        let physical = performance.timeOrigin + performance.now();
        // Truncate to microsecond precision to avoid JS float equality quirks
        physical = Math.floor(physical * 1000) / 1000;

        if (lastHlc) {
            if (physical === lastHlc.physical) {
                return new HybridLogicalClock(physical, lastHlc.logical + 1);
            }
            if (physical < lastHlc.physical) {
                // If physical time went backwards (e.g. OS jitter or clock skew), push logical forward
                return new HybridLogicalClock(lastHlc.physical, lastHlc.logical + 1);
            }
        }

        return new HybridLogicalClock(physical, 0);
    }

    /**
     * Compares two HLCs. Returns < 0 if a < b, > 0 if a > b, 0 if equal.
     * @param {HybridLogicalClock} a 
     * @param {HybridLogicalClock} b 
     * @returns {number}
     */
    static compare(a, b) {
        if (a.physical === b.physical) {
            return a.logical - b.logical;
        }
        return a.physical - b.physical;
    }

    toJSON() {
        return { physical: this.physical, logical: this.logical };
    }

    static fromJSON(json) {
        if (!json || typeof json.physical !== 'number' || typeof json.logical !== 'number') {
            throw new Error('Invalid HLC JSON');
        }
        return new HybridLogicalClock(json.physical, json.logical);
    }
}
