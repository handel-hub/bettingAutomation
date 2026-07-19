/**
 * Base configuration policy for Capability Providers.
 * Provides standard timing, tolerance, and retry configurations.
 */
export class CapabilityPolicy {
    constructor(config = {}) {
        /**
         * Global timeout in milliseconds before a synchronization WaitStrategy fails.
         * Default: 30000ms (30 seconds)
         */
        this.timeoutMs = config.timeoutMs ?? 30000;

        /**
         * Duration in milliseconds the state must remain unchanged before it is considered stable.
         * Default: 50ms
         */
        this.stabilityWindowMs = config.stabilityWindowMs ?? 50;

        /**
         * Maximum number of internal retry attempts for operations within the provider.
         * Default: 3
         */
        this.maxRetries = config.maxRetries ?? 3;
    }
}
