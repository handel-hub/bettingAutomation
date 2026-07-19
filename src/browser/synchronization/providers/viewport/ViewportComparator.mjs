export const ViewportComparisonResult = {
    MATCH: 'MATCH',
    TOLERANCE_MATCH: 'TOLERANCE_MATCH',
    WIDTH_MISMATCH: 'WIDTH_MISMATCH',
    HEIGHT_MISMATCH: 'HEIGHT_MISMATCH',
    DPR_MISMATCH: 'DPR_MISMATCH',
    ORIENTATION_MISMATCH: 'ORIENTATION_MISMATCH',
    VISUAL_SCALE_MISMATCH: 'VISUAL_SCALE_MISMATCH',
    WAITING: 'WAITING'
};

/**
 * Compares expected viewport metadata with actual runtime viewport context.
 */
export class ViewportComparator {
    constructor(policy) {
        this.policy = policy;
    }

    /**
     * @param {Object} expected - metadata.viewport (from master)
     * @param {Object} actual - ViewportContext (from registry)
     * @returns {Object} { result, confidence }
     */
    compare(expected, actual) {
        if (!expected) {
            // No strict viewport expectation provided
            return { result: ViewportComparisonResult.MATCH, confidence: 100 };
        }

        if (!actual || actual.layoutViewportWidth === 0 || actual.layoutViewportHeight === 0) {
            return { result: ViewportComparisonResult.WAITING, confidence: 0 };
        }

        // 1. Strict checks first
        if (this.policy.dprTolerance === 0 && expected.dpr !== actual.dpr) {
            return { result: ViewportComparisonResult.DPR_MISMATCH, confidence: 0 };
        }

        if (this.policy.orientationTolerance === 'exact' && expected.orientation !== actual.orientation) {
            return { result: ViewportComparisonResult.ORIENTATION_MISMATCH, confidence: 0 };
        }

        if (expected.visualScale !== actual.visualViewportScale) {
            // Could add a tolerance for scale, but usually we want it exact (like 1.0 vs 1.25)
            // For now, exact matching.
            // But wait, user didn't specify policy for visualScale, so let's allow slight floating point diffs
            if (Math.abs((expected.visualScale || 1) - (actual.visualViewportScale || 1)) > 0.01) {
                return { result: ViewportComparisonResult.VISUAL_SCALE_MISMATCH, confidence: 10 };
            }
        }

        // 2. Tolerance checks
        const widthDiff = Math.abs(expected.width - actual.layoutViewportWidth);
        const heightDiff = Math.abs(expected.height - actual.layoutViewportHeight);

        if (widthDiff > this.policy.resizeTolerancePx) {
            // Confidence could be inversely proportional to the diff
            const confidence = Math.max(0, 100 - (widthDiff * 2));
            return { result: ViewportComparisonResult.WIDTH_MISMATCH, confidence };
        }

        if (heightDiff > this.policy.resizeTolerancePx) {
            const confidence = Math.max(0, 100 - (heightDiff * 2));
            return { result: ViewportComparisonResult.HEIGHT_MISMATCH, confidence };
        }

        // 3. Match Evaluation
        if (widthDiff > 0 || heightDiff > 0) {
            return { result: ViewportComparisonResult.TOLERANCE_MATCH, confidence: 96 };
        }

        return { result: ViewportComparisonResult.MATCH, confidence: 100 };
    }
}
