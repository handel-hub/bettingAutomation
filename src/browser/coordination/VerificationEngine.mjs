import { logger } from '../../utils/logger.mjs';

export class VerificationEngine {
    constructor() {
        // Initial seeded allowlist for allowed navigation divergences (Master vs Slave)
        // Format: Array of { masterRegex, slaveRegex, description }
        this.allowlist = [
            {
                masterRegex: /^\/login\/success$/,
                slaveRegex: /^\/dashboard\/.*$/,
                description: 'Post-login redirect divergence allowed'
            },
            {
                masterRegex: /^\/dashboard\/.*$/,
                slaveRegex: /^\/login\/success$/,
                description: 'Post-login redirect divergence allowed (inverse)'
            }
        ];
    }

    /**
     * Verifies if a divergence is expected (allowlisted) or an error.
     * @param {Object} observation - The actual StateObservation from the slave
     * @param {Object} expected - The expected state (from ConvergenceEngine pending table)
     * @returns {string} 'EXPECTED' or 'DIVERGED'
     */
    verify(observation, expected) {
        // observation: { nodeId, url, domHash, causingCommandId, timestamp }
        // expected: { commandId, expectedHash, timestamp, timeout, url (we might not have url, wait, does expectConvergence get it?) }
        
        // Let's assume expected.expectedUrl is passed in expectConvergence, or we compare against the last known master URL.
        // Actually, ConvergenceEngine doesn't currently store expectedUrl. Let's look at expectConvergence signature.
        // It's `expectConvergence(slaveId, commandId, expectedHash)`. Let's assume expected url is just known, or we need to pass it.
        // Wait, the migration plan says: 
        // "Hardcode initial allowlist (e.g., ^/login/success$ matching ^/dashboard/.*$)."
        // This means it compares the Master's target URL vs the Slave's resulting URL.
        
        const slaveUrl = new URL(observation.url).pathname;
        const masterUrl = expected.expectedUrl ? new URL(expected.expectedUrl).pathname : null;

        if (!masterUrl) {
            logger.debug(`[VerificationEngine] No expectedUrl provided for command ${expected.commandId}. Cannot verify via allowlist.`);
            return 'DIVERGED';
        }

        for (const rule of this.allowlist) {
            if (rule.masterRegex.test(masterUrl) && rule.slaveRegex.test(slaveUrl)) {
                logger.info(`[VerificationEngine] Divergence ALLOWED: Master(${masterUrl}) vs Slave(${slaveUrl}) matched rule: ${rule.description}`);
                return 'EXPECTED';
            }
        }

        logger.info(`[VerificationEngine] Divergence REJECTED: Master(${masterUrl}) vs Slave(${slaveUrl}) did not match any allowlist rules.`);
        return 'DIVERGED';
    }
}
