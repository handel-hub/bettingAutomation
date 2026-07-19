import { SynchronizationLevel } from '../SynchronizationLevel.mjs';

/**
 * Immutable configuration dictionary of synchronization profiles.
 * Each profile declares the required synchronization level, timeout, and retry policy.
 */
export const SynchronizationProfiles = Object.freeze({
    default: Object.freeze({
        level: SynchronizationLevel.LEVEL_3,
        timeoutMs: 5000,
        domQuietPeriod: 100,
        retryPolicy: { retries: 2, backoff: 500 }
    }),
    click: Object.freeze({
        level: SynchronizationLevel.LEVEL_4,
        timeoutMs: 10000,
        domQuietPeriod: 100,
        retryPolicy: { retries: 3, backoff: 500 }
    }),
    hover: Object.freeze({
        level: SynchronizationLevel.LEVEL_3,
        timeoutMs: 3000,
        domQuietPeriod: 100,
        retryPolicy: { retries: 1, backoff: 300 }
    }),
    type: Object.freeze({
        level: SynchronizationLevel.LEVEL_4,
        timeoutMs: 5000,
        domQuietPeriod: 100,
        retryPolicy: { retries: 2, backoff: 500 }
    }),
    navigation: Object.freeze({
        level: SynchronizationLevel.LEVEL_1,
        timeoutMs: 30000,
        domQuietPeriod: 0,
        retryPolicy: { retries: 1, backoff: 1000 }
    }),
    drag: Object.freeze({
        level: SynchronizationLevel.LEVEL_4,
        timeoutMs: 5000,
        domQuietPeriod: 100,
        retryPolicy: { retries: 2, backoff: 500 }
    })
});
