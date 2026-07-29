/**
 * @typedef {Object} Statistics
 * @property {number} averageLatencyMs
 * @property {number} failureFrequency
 * @property {number} locatorSuccessRate
 */

/**
 * Computes high-level runtime statistics exclusively from derived facts.
 * No subsystem calculates these directly anymore.
 */
export class StatisticsEngine {
    /**
     * @param {import('../query/RuntimeQueryEngine.mjs').RuntimeQueryEngine} queryEngine 
     * @returns {Statistics}
     */
    static aggregate(queryEngine) {
        const measurements = queryEngine.findByType('Measurement');
        const decisions = queryEngine.findByType('Decision');
        const failures = queryEngine.findByType('Failure');

        // Latency
        let totalLatency = 0;
        let latencyCount = 0;
        for (const m of measurements) {
            if (m.unit === 'ms') {
                totalLatency += m.value;
                latencyCount++;
            }
        }

        const averageLatencyMs = latencyCount > 0 ? (totalLatency / latencyCount) : 0;

        // Failure Frequency
        const failureFrequency = failures.length;

        // Locator Success Rate
        const locatorDecisions = decisions.filter(d => d.domain === 'Locator');
        const locatorFailures = failures.filter(f => f.domain === 'Locator');
        
        let locatorSuccessRate = 1.0;
        if (locatorDecisions.length > 0) {
            locatorSuccessRate = (locatorDecisions.length - locatorFailures.length) / locatorDecisions.length;
            if (locatorSuccessRate < 0) locatorSuccessRate = 0;
        }

        return {
            averageLatencyMs,
            failureFrequency,
            locatorSuccessRate
        };
    }
}
