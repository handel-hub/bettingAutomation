import { logger } from '../../../config.mjs';

/**
 * Lightweight monotonic time synchronization utility.
 * Maintains an offset between local system time and master clock timestamp,
 * clamping drift adjustments to prevent sudden time jumps.
 */
class NTPClockSyncService {
    constructor() {
        this.offset = 0;
        this.maxStepMs = 250; // Max allowed instant time jump in ms during a single sync
    }

    /**
     * Get the current synchronized monotonic timestamp.
     * @returns {number} Current timestamp in milliseconds adjusted by offset
     */
    now() {
        return Date.now() + this.offset;
    }

    /**
     * Get the current calculated clock offset in milliseconds.
     * @returns {number}
     */
    getOffset() {
        return this.offset;
    }

    /**
     * Synchronize local clock with a master timestamp.
     * Clamps drift adjustments to prevent sudden time jumps that could disrupt deadline calculations.
     * @param {number} masterTimestamp - Timestamp received from master
     * @param {number} [localTimestamp=Date.now()] - Timestamp when master timestamp was received
     */
    sync(masterTimestamp, localTimestamp = Date.now()) {
        if (typeof masterTimestamp !== 'number' || isNaN(masterTimestamp)) {
            return;
        }

        const rawOffset = masterTimestamp - localTimestamp;
        const drift = rawOffset - this.offset;

        // If this is the initial sync (offset === 0 and rawOffset is large), accept it directly
        if (this.offset === 0 && Math.abs(rawOffset) > this.maxStepMs) {
            this.offset = rawOffset;
            logger.debug(`[NTPClockSync] Initial clock sync offset established: ${this.offset}ms`);
            return;
        }

        // Clamp drift adjustment step
        let step = drift;
        if (drift > this.maxStepMs) {
            step = this.maxStepMs;
        } else if (drift < -this.maxStepMs) {
            step = -this.maxStepMs;
        }

        this.offset += step;
        if (Math.abs(drift) > 50) {
            logger.debug(`[NTPClockSync] Adjusted clock offset by ${step}ms (raw drift: ${drift}ms, new offset: ${this.offset}ms)`);
        }
    }

    /**
     * Reset offset to zero (useful for unit testing).
     */
    reset() {
        this.offset = 0;
    }
}

export const NTPClockSync = new NTPClockSyncService();
export default NTPClockSync;
