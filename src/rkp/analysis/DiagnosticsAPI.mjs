import { ExplainabilityEngine } from './explainability/ExplainabilityEngine.mjs';
import { StatisticsEngine } from './explainability/StatisticsEngine.mjs';
import { HealthEngine } from './health/HealthEngine.mjs';
import { InvariantChecker } from './validation/InvariantChecker.mjs';

/**
 * @typedef {Object} DiagnosticReport
 * @property {import('./health/HealthEngine.mjs').HealthMetrics} health
 * @property {import('./explainability/StatisticsEngine.mjs').Statistics} statistics
 * @property {string[]} invariantsViolated
 * @property {string[]} explanations
 */

/**
 * The apex interface for the Runtime Knowledge Analysis Platform.
 * Strictly coordinates Query, Explainability, Statistics, and Health engines.
 * NEVER parses WAL files directly.
 */
export class DiagnosticsAPI {
    /**
     * @param {import('./query/RuntimeQueryEngine.mjs').RuntimeQueryEngine} queryEngine 
     */
    constructor(queryEngine) {
        this.queryEngine = queryEngine;
    }

    /**
     * @returns {DiagnosticReport}
     */
    diagnoseSystem() {
        const stats = StatisticsEngine.aggregate(this.queryEngine);
        const health = HealthEngine.evaluate(this.queryEngine, stats);
        const violations = InvariantChecker.verify(this.queryEngine);

        const explanations = [];
        
        // Explain all failures
        const failures = this.queryEngine.findByType('Failure');
        for (const failure of failures) {
            explanations.push(ExplainabilityEngine.explain(failure, this.queryEngine));
        }

        return {
            health,
            statistics: stats,
            invariantsViolated: violations,
            explanations
        };
    }

    /**
     * @param {string} traceId 
     * @returns {DiagnosticReport}
     */
    diagnoseTrace(traceId) {
        // Scoped statistics and health evaluations
        const stats = StatisticsEngine.aggregate(this.queryEngine, traceId);
        const health = HealthEngine.evaluate(this.queryEngine, stats, traceId);
        const violations = InvariantChecker.verify(this.queryEngine).filter(v => v.includes(traceId));

        const explanations = [];
        const traceFacts = this.queryEngine.findByTraceId(traceId);
        const traceFailures = traceFacts.filter(f => f.type === 'Failure');
        
        for (const failure of traceFailures) {
            explanations.push(ExplainabilityEngine.explain(failure, this.queryEngine));
        }

        return {
            health,
            statistics: stats, // Global stats
            invariantsViolated: violations,
            explanations
        };
    }
}
