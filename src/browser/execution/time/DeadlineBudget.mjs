import { NTPClockSync } from './NTPClockSync.mjs';
import featureFlags from '../locatorIntelligence/FeatureFlags.mjs';
import { QueueDeadlineExceededError, GlobalTimeoutError } from '../errors.mjs';
import { TelemetryCollector } from '../locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { logger } from '../../../config.mjs';

/**
 * Immutable deadline tracker for distributed queue and resolution budgeting under Candidate D specification (ENG-PLAN-V3-2026-07).
 * Enforces a strict monotonic TTL from command capture time across network and execution boundaries.
 */
export class DeadlineBudget {
    /**
     * @param {number} captureTime - Monotonic timestamp when command was captured
     * @param {number} [ttlMs=1500] - Total time-to-live budget in milliseconds
     */
    constructor(captureTime, ttlMs = 1500) {
        this.captureTime = typeof captureTime === 'number' && !isNaN(captureTime) && captureTime > 0 ? captureTime : NTPClockSync.now();
        this.ttlMs = (ttlMs === null || ttlMs === 0 || ttlMs === Infinity || ttlMs < 0) ? null : (typeof ttlMs === 'number' && !isNaN(ttlMs) ? ttlMs : 1500);
        this.deadline = this.ttlMs === null ? Number.MAX_SAFE_INTEGER : (this.captureTime + this.ttlMs);
        Object.freeze(this);
    }

    /**
     * Get remaining time in milliseconds before deadline expiration against NTP monotonic clock.
     * @returns {number} Remaining milliseconds (0 if expired)
     */
    getRemainingMs() {
        if (this.ttlMs === null) {
            return Number.MAX_SAFE_INTEGER;
        }
        const now = NTPClockSync.now();
        const remaining = this.deadline - now;
        return Math.max(0, remaining);
    }

    /**
     * Alias for getRemainingMs to satisfy the remediation implementation requirement.
     * @returns {number} Remaining milliseconds
     */
    timeRemaining() {
        return this.getRemainingMs();
    }

    /**
     * Check whether the deadline budget has expired.
     * Only enforces expiration if V3_ENABLE_GLOBAL_TTL feature flag is active.
     * @returns {boolean} True if expired under V3_ENABLE_GLOBAL_TTL
     */
    isExpired() {
        if (!featureFlags.isEnabled('V3_ENABLE_GLOBAL_TTL')) {
            return false;
        }
        if (this.ttlMs === null) {
            return false;
        }
        return this.getRemainingMs() === 0;
    }

    /**
     * Check deadline and throw appropriate error if expired (Algorithm 3: Monotonic TTL Deadline Eviction).
     * @param {string} [owner='Execution'] - Calling subsystem ('ExecutionScheduler', 'LocatorResolver', etc.)
     * @throws {QueueDeadlineExceededError|GlobalTimeoutError} If expired
     */
    checkOrThrow(owner = 'Execution') {
        if (this.isExpired()) {
            const now = NTPClockSync.now();
            const elapsed = now - this.captureTime;
            const msg = `[${owner}] Deadline budget expired (TTL: ${this.ttlMs}ms, elapsed: ${elapsed}ms from captureTime ${this.captureTime})`;
            
            logger.warn(`[DeadlineBudget] ${msg}`);
            
            if (owner === 'ExecutionScheduler') {
                try {
                    TelemetryCollector.registry.recordFailureCode('LF-702');
                } catch (err) {}
                throw new QueueDeadlineExceededError(`[LF-702] ${msg}`);
            } else {
                try {
                    TelemetryCollector.registry.recordFailureCode('LF-504');
                } catch (err) {}
                const error = new GlobalTimeoutError(`[LF-504] ${msg}`);
                if (typeof error.addChain === 'function') {
                    error.addChain(`[LF-504] ${msg}`);
                }
                throw error;
            }
        }
    }

    /**
     * Create a DeadlineBudget instance from a Command object.
     * @param {object} command - Command instance or payload
     * @param {number} [ttlMs=1500] - TTL budget in ms
     * @returns {DeadlineBudget}
     */
    static fromCommand(command, ttlMs = 1500) {
        const capTime = command?.captureTime ?? command?.timestamp ?? command?.creationTime ?? NTPClockSync.now();
        const cmdTtl = command?.ttlMs !== undefined ? command.ttlMs : ttlMs;
        return new DeadlineBudget(capTime, cmdTtl);
    }
}
