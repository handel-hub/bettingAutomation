import { 
    validateDecisionFact, 
    validateMeasurementFact, 
    validateStateDeltaFact, 
    validateFailureFact, 
    validateLogFact 
} from '../../models/index.mjs';

/**
 * Normalizes raw facts coming from any IFactSource.
 * Enforces schema compliance, upgrades legacy fields, and injects default values.
 * Downstream analysis components must strictly consume facts from FactNormalizer.
 */
export class FactNormalizer {
    /**
     * @param {any} rawFact 
     * @returns {import('../../models/index.mjs').BaseFact}
     */
    static normalize(rawFact) {
        if (!rawFact || typeof rawFact !== 'object') {
            throw new Error('Raw fact must be an object');
        }

        const fact = { ...rawFact };

        // 1. Backwards Compatibility & Defaults
        fact.traceId = fact.traceId || fact.trace_id || 'unknown-trace';
        fact.spanId = fact.spanId || fact.span_id || 'unknown-span';
        fact.domain = fact.domain || 'Diagnostics';
        
        // Convert legacy types if necessary
        if (fact.type === 'Error') {
            fact.type = 'Failure';
            fact.errorMessage = fact.errorMessage || fact.message || 'Unknown Error';
            fact.errorCode = fact.errorCode || fact.code || 'UNKNOWN';
            fact.recoveryStrategy = fact.recoveryStrategy || 'NONE';
        }

        if (fact.type === 'Decision') {
            fact.actionTaken = fact.actionTaken || 'UNKNOWN_ACTION';
            fact.alternativesDiscarded = fact.alternativesDiscarded || [];
            if (!fact.evidence) {
                fact.evidence = { constraintsEvaluated: [], metrics: {} };
            }
            if (!fact.evidence.constraintsEvaluated) {
                fact.evidence.constraintsEvaluated = [];
            }
        }

        if (fact.type === 'Measurement') {
            fact.metricName = fact.metricName || 'UnknownMetric';
            fact.value = fact.value ?? 0;
            fact.unit = ['ms', 'bytes', 'count'].includes(fact.unit) ? fact.unit : 'count';
        }
        
        if (fact.type === 'State') {
            fact.version = fact.version ?? 0;
            fact.parentVersion = fact.parentVersion ?? 0;
            fact.delta = fact.delta || {};
        }

        // 2. Strict Schema Validation
        switch (fact.type) {
            case 'Decision':
                validateDecisionFact(fact);
                break;
            case 'Measurement':
                validateMeasurementFact(fact);
                break;
            case 'State':
                validateStateDeltaFact(fact);
                break;
            case 'Failure':
                validateFailureFact(fact);
                break;
            case 'LogFact':
                validateLogFact(fact);
                break;
            default:
                throw new Error(`Unsupported fact type during normalization: ${fact.type}`);
        }

        return fact;
    }
}
