/**
 * Immutable Time Constants for Distributed Synchronization, Deadline Budgeting, and Recovery.
 * Enforces authoritative time boundaries across all browser automation workers.
 */
export const TimeConstants = Object.freeze({
    /** Step clamping limit for NTP monotonic clock adjustments (ms) */
    KAPPA_STEP_MS: 250,
    /** Interval between periodic NTP synchronization pings (ms) */
    NTP_SYNC_INTERVAL_MS: 30000,
    /** Maximum cumulative local recovery budget before fast-aborting (ms) */
    T_MAX_RECOVERY_MS: 1000,
    /** Global distributed TTL budget across ingress to execution (ms) */
    GLOBAL_TTL_MS: 1500,
    /** Fast-fail boundary for contract violations and schema check failures (ms) */
    FAST_FAIL_BOUNDARY_MS: 15
});

export default TimeConstants;
