import { NTPClockSync } from './NTPClockSync.mjs';
import featureFlags from '../locatorIntelligence/FeatureFlags.mjs';
import { QueueDeadlineExceededError, GlobalTimeoutError } from '../errors.mjs';

/**
 * Immutable deadline tracker for distributed queue and resolution budgeting.
 * Enforces a strict TTL from command capture time across network and execution boundaries.
 */
export class DeadlineBudget {
    /**
     * @param {number} captureTime - Monotonic timestamp when command was captured
     * @param {number} [ttlMs=1500] - Total time-to-live budget in milliseconds
     */
    constructor(captureTime, ttlMs = 1500) {
        this.captureTime = typeof captureTime === 'number' && !isNaN(captureTime) ? captureTime : NTPClockSync.now();
        this.ttlMs = typeof ttlMs === 'number' && !isNaN(ttlMs) ? ttlMs : 1500;
        this.deadline = this.captureTime + this.ttlMs;
        Object.freeze(this);
    }

    /**
     * Get remaining time in milliseconds before deadline expiration.
     * @returns {number} Remaining milliseconds (0 if expired)
     */
    getRemainingMs() {
        const now = NTPClockSync.now();
        const remaining = this.deadline - now;
        return Math.max(0, remaining);
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
        return this.getRemainingMs() === 0;
    }

    /**
     * Check deadline and throw appropriate error if expired.
     * @param {string} [owner='Execution'] - Calling subsystem ('ExecutionScheduler', 'LocatorResolver', etc.)
     * @throws {QueueDeadlineExceededError|GlobalTimeoutError} If expired
     */
    checkOrThrow(owner = 'Execution') {
        if (this.isExpired()) {
            const msg = `[${owner}] Deadline budget expired (TTL: ${this.ttlMs}ms from captureTime ${this.captureTime})`;
            if (owner === 'ExecutionScheduler') {
                throw new QueueDeadlineExceededError(`[LF-702] ${msg}`);
            } else {
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
        return new DeadlineBudget(capTime, ttlMs);
    }
}
