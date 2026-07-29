/**
 * @typedef {Object} HealthMetrics
 * @property {string} browserHealth 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
 * @property {string} locatorHealth 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
 * @property {string} synchronizationHealth 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
 */

/**
 * Evaluates the systemic health of subsystems purely from derived facts and statistics.
 */
export class HealthEngine {
    /**
     * @param {import('../query/RuntimeQueryEngine.mjs').RuntimeQueryEngine} queryEngine 
     * @param {import('../explainability/StatisticsEngine.mjs').Statistics} stats 
     * @returns {HealthMetrics}
     */
    static evaluate(queryEngine, stats) {
        let browserHealth = 'HEALTHY';
        let locatorHealth = 'HEALTHY';
        let synchronizationHealth = 'HEALTHY';

        // 1. Locator Health
        if (stats.locatorSuccessRate < 0.5) {
            locatorHealth = 'CRITICAL';
        } else if (stats.locatorSuccessRate < 0.8) {
            locatorHealth = 'DEGRADED';
        }

        // 2. Browser Health
        const browserFailures = queryEngine.findByType('Failure').filter(f => f.domain === 'Browser');
        if (browserFailures.length > 5) {
            browserHealth = 'CRITICAL';
        } else if (browserFailures.length > 0) {
            browserHealth = 'DEGRADED';
        }

        // 3. Sync Health
        if (stats.averageLatencyMs > 5000) {
            synchronizationHealth = 'CRITICAL';
        } else if (stats.averageLatencyMs > 1000) {
            synchronizationHealth = 'DEGRADED';
        }

        return {
            browserHealth,
            locatorHealth,
            synchronizationHealth
        };
    }
}
