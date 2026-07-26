import { EIDComparator } from './EIDComparator.mjs';
import { SlaveEIDExtractor } from './SlaveEIDExtractor.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class VerificationEngine {
    constructor(config = {}) {
        this.minConfidence = config.minThreshold !== undefined ? Number(config.minThreshold) : (config.minConfidence !== undefined ? Number(config.minConfidence) : 0.65);
        this.minThreshold = this.minConfidence;
        this.comparator = new EIDComparator(config.weights || null);
    }

    /**
     * Verifies that the resolved element on the slave matches the master's EID.
     * @param {import('playwright').Page} page Playwright Page
     * @param {string} locator The locator selector string
     * @param {ElementIdentityDocument} originalEID Master-side EID to match against
     * @returns {Promise<{ verified: boolean, similarity: object|null, reason: string|null }>}
     */
    async verify(page, locator, originalEID) {
        if (!originalEID) {
            return {
                verified: true,
                similarity: null,
                reason: 'No master EID provided - unique match accepted without verification'
            };
        }

        let slaveEID;
        try {
            slaveEID = await SlaveEIDExtractor.extract(page, locator);
        } catch (e) {
            TelemetryCollector.recordVerification(false, 0);
            return {
                verified: false,
                similarity: null,
                reason: `LF-302: Extraction failed during verification: ${e.message}`
            };
        }

        if (!slaveEID) {
            TelemetryCollector.recordVerification(false, 0);
            return {
                verified: false,
                similarity: null,
                reason: 'LF-302: Element vanished before verification (extracted null EID)'
            };
        }

        const similarity = this.comparator.compare(originalEID, slaveEID);
        
        if (similarity.overallScore >= this.minConfidence) {
            TelemetryCollector.recordVerification(true, similarity.overallScore);
            return { verified: true, similarity, reason: 'Verification successful' };
        } else {
            TelemetryCollector.recordVerification(false, similarity.overallScore);
            return {
                verified: false,
                similarity,
                reason: `LF-601: Verification failed - confidence (${similarity.overallScore.toFixed(2)}) below minThreshold (${this.minConfidence})`
            };
        }
    }
}
export default VerificationEngine;
