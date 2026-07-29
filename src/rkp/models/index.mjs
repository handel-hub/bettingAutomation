/**
 * @typedef {('Execution' | 'Synchronization' | 'Locator' | 'Navigation' | 'Scheduler' | 'Browser' | 'Network' | 'Recovery' | 'Diagnostics' | 'Storage' | 'Security')} Domain
 */

/**
 * @typedef {('Decision' | 'Measurement' | 'Failure' | 'State' | 'LogFact')} FactType
 */

/**
 * @typedef {Object} BaseFact
 * @property {Domain} domain
 * @property {FactType} type
 * @property {string} [hlc]
 * @property {number} [lsn]
 * @property {number} [physicalTime]
 * @property {string} traceId
 * @property {string} spanId
 */

/**
 * @typedef {Object} Evidence
 * @property {number} [stateSnapshotRef]
 * @property {Record<string, number>} [metrics]
 * @property {string[]} constraintsEvaluated
 */

/**
 * @typedef {BaseFact & { type: 'Decision', actionTaken: string, alternativesDiscarded: string[], confidenceScore: number | null, evidence: Evidence }} DecisionFact
 */

/**
 * @typedef {BaseFact & { type: 'Measurement', metricName: string, value: number, unit: 'ms' | 'bytes' | 'count' }} MeasurementFact
 */

/**
 * @typedef {BaseFact & { type: 'State', version: number, parentVersion: number, delta: any }} StateDeltaFact
 */

/**
 * @typedef {BaseFact & { type: 'Failure', recoveryStrategy: string, errorMessage: string, errorCode: string }} FailureFact
 */

/**
 * @typedef {BaseFact & { type: 'LogFact', level: string, message: string, metadata?: any }} LogFact
 */

export const DOMAINS = new Set([
  'Execution', 'Synchronization', 'Locator', 'Navigation', 'Scheduler',
  'Browser', 'Network', 'Recovery', 'Diagnostics', 'Storage', 'Security'
]);

export const FACT_TYPES = new Set(['Decision', 'Measurement', 'Failure', 'State', 'LogFact']);

/**
 * Validates a base fact to ensure it matches the schema.
 * Throws an Error if invalid.
 * @param {any} fact 
 */
export function validateBaseFact(fact) {
  if (!fact || typeof fact !== 'object') throw new Error('Fact must be an object');
  if (!DOMAINS.has(fact.domain)) throw new Error(`Invalid domain: ${fact.domain}`);
  if (!FACT_TYPES.has(fact.type)) throw new Error(`Invalid fact type: ${fact.type}`);
  if (typeof fact.traceId !== 'string') throw new Error('traceId must be a string');
  if (typeof fact.spanId !== 'string') throw new Error('spanId must be a string');
  
  if (fact.hlc !== undefined && typeof fact.hlc !== 'string') throw new Error('hlc must be a string');
  if (fact.lsn !== undefined && typeof fact.lsn !== 'number') throw new Error('lsn must be a number');
  if (fact.physicalTime !== undefined && typeof fact.physicalTime !== 'number') throw new Error('physicalTime must be a number');
}

/**
 * @param {any} fact
 */
export function validateDecisionFact(fact) {
  validateBaseFact(fact);
  if (fact.type !== 'Decision') throw new Error('Not a Decision fact');
  if (typeof fact.actionTaken !== 'string') throw new Error('Decision must have actionTaken string');
  if (!Array.isArray(fact.alternativesDiscarded)) throw new Error('Decision must have alternativesDiscarded array');
  if (!fact.evidence || typeof fact.evidence !== 'object') throw new Error('Decision must have evidence object');
  if (!Array.isArray(fact.evidence.constraintsEvaluated)) throw new Error('Evidence must have constraintsEvaluated array');
}

/**
 * @param {any} fact
 */
export function validateMeasurementFact(fact) {
  validateBaseFact(fact);
  if (fact.type !== 'Measurement') throw new Error('Not a Measurement fact');
  if (typeof fact.metricName !== 'string') throw new Error('Measurement must have metricName string');
  if (typeof fact.value !== 'number') throw new Error('Measurement must have value number');
  if (!['ms', 'bytes', 'count'].includes(fact.unit)) throw new Error('Measurement must have valid unit');
}

/**
 * @param {any} fact
 */
export function validateStateDeltaFact(fact) {
  validateBaseFact(fact);
  if (fact.type !== 'State') throw new Error('Not a State fact');
  if (typeof fact.version !== 'number') throw new Error('State must have version number');
  if (typeof fact.parentVersion !== 'number') throw new Error('State must have parentVersion number');
  if (fact.delta === undefined) throw new Error('State must have delta');
}

/**
 * @param {any} fact
 */
export function validateFailureFact(fact) {
    validateBaseFact(fact);
    if (fact.type !== 'Failure') throw new Error('Not a Failure fact');
    if (typeof fact.recoveryStrategy !== 'string') throw new Error('Failure must have recoveryStrategy string');
    if (typeof fact.errorMessage !== 'string') throw new Error('Failure must have errorMessage string');
    if (typeof fact.errorCode !== 'string') throw new Error('Failure must have errorCode string');
}

/**
 * @param {any} fact
 */
export function validateLogFact(fact) {
    validateBaseFact(fact);
    if (fact.type !== 'LogFact') throw new Error('Not a LogFact');
    if (typeof fact.level !== 'string') throw new Error('LogFact must have level string');
    if (typeof fact.message !== 'string') throw new Error('LogFact must have message string');
}
