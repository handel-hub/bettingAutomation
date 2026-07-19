import { CapabilityPolicy } from '../CapabilityPolicy.mjs';

/**
 * Configuration policy for the ViewportCapabilityProvider.
 */
export class ViewportPolicy extends CapabilityPolicy {
    constructor(config = {}) {
        super(config);

        /**
         * The maximum acceptable difference in pixels between the master and slave 
         * width/height before declaring a WIDTH_MISMATCH or HEIGHT_MISMATCH.
         * Default: 2px
         */
        this.resizeTolerancePx = config.resizeTolerancePx ?? 2;

        /**
         * The maximum acceptable difference in Device Pixel Ratio (DPR).
         * Default: 0 (Strict exact match)
         */
        this.dprTolerance = config.dprTolerance ?? 0;

        /**
         * Tolerance for orientation matching.
         * Default: 'exact'
         */
        this.orientationTolerance = config.orientationTolerance ?? 'exact';
    }
}
