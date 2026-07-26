import { logger } from '../../../config.mjs';
import { TelemetryCollector } from '../locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { ClockDriftError } from '../errors.mjs';

/**
 * Authoritative monotonic time synchronization utility for Candidate D specification (ENG-PLAN-V3-2026-07).
 * Maintains a clamped offset between local system time and master clock timestamp,
 * enforcing monotonic time progression and exponential backoff during network failures.
 */
class NTPClockSyncService {
    constructor() {
        this.offset = 0;
        this.maxStepMs = 250; // Max allowed instant time jump in ms during a single sync step
        this._lastMonotonic = 0;
        this._syncCount = 0;
        this._lastDrift = 0;
        this._severeDriftCount = 0;
        
        // Auto-sync loop state
        this._timer = null;
        this._backoffDelay = 1000; // Start exponential backoff at 1s
        this._maxBackoffDelay = 30000; // Max backoff capped at 30s
    }

    /**
     * Get the current synchronized monotonic timestamp.
     * Guarantees time never steps backward even if offset decreases or system clock steps back.
     * @returns {number} Current timestamp in milliseconds adjusted by offset
     */
    now() {
        const rawNow = Date.now() + this.offset;
        if (rawNow > this._lastMonotonic) {
            this._lastMonotonic = rawNow;
        }
        return this._lastMonotonic;
    }

    /**
     * Get the current calculated clock offset in milliseconds.
     * @returns {number}
     */
    getOffset() {
        return this.offset;
    }

    /**
     * Returns real-time metrics on clock drift, offset, and sync counts.
     * @returns {{ currentOffset: number, lastDrift: number, syncCount: number, severeDriftCount: number, isMonotonic: boolean }}
     */
    getDriftMetrics() {
        return {
            currentOffset: this.offset,
            lastDrift: this._lastDrift,
            syncCount: this._syncCount,
            severeDriftCount: this._severeDriftCount,
            isMonotonic: true
        };
    }

    /**
     * Synchronize local clock with a master timestamp using Algorithm 2 (NTP Step Clamping & Monotonic Drift Correction).
     * Clamps drift adjustments to prevent sudden time jumps that could disrupt deadline calculations.
     * @param {number} masterTimestamp - Timestamp received from master
     * @param {number} [localTimestamp=Date.now()] - Timestamp when master timestamp was received
     */
    sync(masterTimestamp, localTimestamp = Date.now()) {
        if (typeof masterTimestamp !== 'number' || isNaN(masterTimestamp)) {
            return;
        }

        const delta = masterTimestamp - localTimestamp;
        const drift = delta - this.offset;
        this._lastDrift = drift;

        // If this is the initial sync, accept delta directly to establish baseline without slow convergence
        if (this._syncCount === 0 && Math.abs(delta) > this.maxStepMs) {
            this.offset = delta;
            this._syncCount++;
            logger.debug(`[NTPClockSync] Initial clock sync offset established: ${this.offset}ms (delta: ${delta}ms)`);
            return;
        }

        // Algorithm 2 step clamping
        let step = drift;
        if (Math.abs(drift) <= 50) {
            step = drift; // Instant convergence for minor drift
        } else if (drift > 50) {
            step = Math.min(this.maxStepMs, drift);
        } else {
            step = Math.max(-this.maxStepMs, drift);
        }

        this.offset += step;
        this._syncCount++;

        if (Math.abs(drift) > 50) {
            logger.debug(`[NTPClockSync] Adjusted clock offset by ${step}ms (raw drift: ${drift}ms, new offset: ${this.offset}ms)`);
        }

        // Severe drift alerting (Algorithm 2 line 10)
        if (Math.abs(drift) > 1000) {
            this._severeDriftCount++;
            const warnMsg = `[LF-704] Severe Time Drift Detected: drift=${drift}ms exceeds 1000ms threshold (offset=${this.offset}ms)`;
            logger.warn(`[NTPClockSync] ${warnMsg}`);
            try {
                TelemetryCollector.registry.recordFailureCode('LF-704');
            } catch (err) {
                // Ignore telemetry errors during tests or teardown
            }
        }
    }

    /**
     * Attempts a network synchronization against an HTTP/WebSocket endpoint with RTT compensation.
     * @param {string} endpointUrl - Master NTP or timestamp endpoint URL
     * @param {Function} fetchFn - Async fetch function (e.g. fetch or axios)
     * @returns {Promise<boolean>} True if sync succeeded, false on failure
     */
    async syncNetwork(endpointUrl, fetchFn = globalThis.fetch) {
        if (typeof fetchFn !== 'function') {
            logger.warn('[NTPClockSync] No valid fetch function provided for syncNetwork');
            return false;
        }

        const start = Date.now();
        try {
            const res = await fetchFn(endpointUrl);
            const end = Date.now();
            const rtt = end - start;

            let data;
            if (typeof res.json === 'function') {
                data = await res.json();
            } else if (res.data) {
                data = res.data;
            } else {
                data = res;
            }

            const masterTimestamp = data?.timestamp ?? data?.serverTime ?? data;
            if (typeof masterTimestamp === 'number' && !isNaN(masterTimestamp)) {
                // Compensate for half round-trip time
                const compensatedMaster = masterTimestamp + (rtt / 2);
                this.sync(compensatedMaster, end);
                this._backoffDelay = 1000; // Reset backoff on success
                return true;
            }
            throw new Error('Invalid timestamp in response');
        } catch (err) {
            logger.warn(`[NTPClockSync] Network sync failed against ${endpointUrl}: ${err.message}`);
            return false;
        }
    }

    /**
     * Starts an automatic recurring synchronization loop with exponential backoff on failure.
     * @param {string} endpointUrl - Endpoint URL to synchronize against
     * @param {Function} [fetchFn=globalThis.fetch] - Async fetch function
     * @param {number} [intervalMs=15000] - Regular sync interval (default 15s)
     */
    startAutoSync(endpointUrl, fetchFn = globalThis.fetch, intervalMs = 15000) {
        this.stopAutoSync();
        const loop = async () => {
            const success = await this.syncNetwork(endpointUrl, fetchFn);
            let nextDelay = intervalMs;
            if (!success) {
                // Apply exponential backoff (1s -> 2s -> 4s -> ... -> max 30s)
                nextDelay = this._backoffDelay;
                this._backoffDelay = Math.min(this._maxBackoffDelay, this._backoffDelay * 2);
                logger.debug(`[NTPClockSync] Scheduling retry with exponential backoff in ${nextDelay}ms`);
            }
            this._timer = setTimeout(loop, nextDelay);
            if (this._timer && typeof this._timer.unref === 'function') {
                this._timer.unref();
            }
        };
        this._timer = setTimeout(loop, 0);
        if (this._timer && typeof this._timer.unref === 'function') {
            this._timer.unref();
        }
    }

    /**
     * Stops the recurring synchronization loop.
     */
    stopAutoSync() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    /**
     * Reset offset and drift counters back to zero (useful for unit testing).
     */
    reset() {
        this.stopAutoSync();
        this.offset = 0;
        this._lastMonotonic = 0;
        this._syncCount = 0;
        this._lastDrift = 0;
        this._severeDriftCount = 0;
        this._backoffDelay = 1000;
    }
}

export const NTPClockSync = new NTPClockSyncService();
export default NTPClockSync;
