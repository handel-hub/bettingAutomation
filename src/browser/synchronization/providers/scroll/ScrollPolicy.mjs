import { CapabilityPolicy } from '../CapabilityPolicy.mjs';

/**
 * Configuration policy for the ScrollCapabilityProvider.
 */
export class ScrollPolicy extends CapabilityPolicy {
    constructor(config = {}) {
        // Set default capability policy values if not provided
        config.stabilityWindowMs = config.stabilityWindowMs ?? 75;
        
        super(config);

        /**
         * The maximum acceptable difference in pixels between the master and slave 
         * scroll coordinates before declaring a MISMATCH.
         * Default: 2px
         */
        this.positionTolerancePx = config.positionTolerancePx ?? 2;

        /**
         * The velocity below which scrolling is considered stopped.
         * Default: 0
         */
        this.velocityThreshold = config.velocityThreshold ?? 0;

        /**
         * The maximum amount of time to wait for momentum scrolling to stop.
         * Default: 1000ms
         */
        this.maxMomentumWaitMs = config.maxMomentumWaitMs ?? 1000;
        
        /**
         * The maximum amount of time to wait in WAITING_FOR_CONTENT state.
         * Default: 500ms
         */
        this.virtualizationTimeoutMs = config.virtualizationTimeoutMs ?? 500;
    }
}
