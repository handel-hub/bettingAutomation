/**
 * @typedef {Object} HLCStamp
 * @property {number} pt - Physical time (milliseconds)
 * @property {number} l - Logical counter
 */

/**
 * Hybrid Logical Clock (HLC)
 * Provides causally consistent, globally sortable timestamps combining physical time and a logical counter.
 */
export class HybridLogicalClock {
  /**
   * @param {() => number} [timeProvider] - Dependency injection for time (defaults to Date.now)
   */
  constructor(timeProvider = Date.now) {
    this.timeProvider = timeProvider;
    this.pt = this.timeProvider();
    this.l = 0;
  }

  /**
   * Advances the clock for a local event.
   * @returns {string} The serialized HLC stamp
   */
  tick() {
    const now = this.timeProvider();
    if (now > this.pt) {
      this.pt = now;
      this.l = 0;
    } else {
      // Time went backwards or is the same, increment logical clock to preserve strict causality.
      this.l++;
    }
    return this.serialize();
  }

  /**
   * Merges a remote clock with the local clock for an incoming IPC/network event.
   * Maintains causality by taking the maximum of local physical time, remote physical time, and current physical time.
   * @param {string} remoteHlcStr 
   * @returns {string} The updated serialized HLC stamp
   */
  update(remoteHlcStr) {
    const remote = HybridLogicalClock.deserialize(remoteHlcStr);
    const now = this.timeProvider();

    if (now > this.pt && now > remote.pt) {
      this.pt = now;
      this.l = 0;
      return this.serialize();
    }

    if (this.pt === remote.pt) {
      this.l = Math.max(this.l, remote.l) + 1;
    } else if (this.pt > remote.pt) {
      this.l++;
    } else {
      this.pt = remote.pt;
      this.l = remote.l + 1;
    }

    return this.serialize();
  }

  /**
   * Serializes the HLC into a lexicographically sortable string.
   * Uses base-36 encoding to save space.
   * @returns {string}
   */
  serialize() {
    // pt is padded to 11 characters (base36 max > year 5138)
    // l is padded to 5 characters (base36 max > 60 million logical ticks per millisecond)
    const ptStr = this.pt.toString(36).padStart(11, '0');
    const lStr = this.l.toString(36).padStart(5, '0');
    return `${ptStr}-${lStr}`;
  }

  /**
   * Deserializes a string back into an HLCStamp.
   * @param {string} serialized 
   * @returns {HLCStamp}
   */
  static deserialize(serialized) {
    if (!serialized || typeof serialized !== 'string') {
        throw new Error('Invalid HLC: must be a string');
    }
    const parts = serialized.split('-');
    if (parts.length !== 2) {
        throw new Error('Invalid HLC format: expected pt-l');
    }
    
    const pt = parseInt(parts[0], 36);
    const l = parseInt(parts[1], 36);
    
    if (isNaN(pt) || isNaN(l)) {
        throw new Error('Invalid HLC values: expected base36 numbers');
    }

    return { pt, l };
  }
}
