import { HybridLogicalClock } from './hlc.mjs';
import { 
  validateDecisionFact, 
  validateMeasurementFact, 
  validateStateDeltaFact, 
  validateFailureFact,
  validateLogFact
} from '../models/index.mjs';

/**
 * Interface definition (JSDoc)
 * @interface IKnowledgePublisher
 */
/**
 * @function
 * @name IKnowledgePublisher#record
 * @param {import('../models/index.mjs').BaseFact} fact
 * @returns {void}
 */

/**
 * The single ingress point for all RuntimeFacts.
 * Assigns Hybrid Logical Clocks, Local Sequence Numbers, and delegates to the Ledger sink.
 * @implements {IKnowledgePublisher}
 */
export class RuntimeRecorder {
  /**
   * @param {Object} [options]
   * @param {HybridLogicalClock} [options.hlc]
   * @param {{ append: (fact: any) => void }} [options.sink] - The destination ledger (mocked in Phase 1)
   */
  constructor({ hlc = new HybridLogicalClock(), sink = { append: () => {} } } = {}) {
    this.hlc = hlc;
    this.sink = sink;
    this.lsn = 0;
  }

  /**
   * @param {import('../models/index.mjs').BaseFact} fact 
   */
  record(fact) {
    // 1. Validation 
    this._validate(fact);

    // 2. Tick HLC
    const hlcStamp = this.hlc.tick();

    // 3. Assign timing and sequence variables (mutates fact directly to avoid allocation on hot path)
    // CONTRACT: Ownership Transfer. The caller relinquishes all ownership of this fact upon calling record().
    fact.hlc = hlcStamp;
    fact.physicalTime = this.hlc.pt;
    fact.lsn = ++this.lsn;

    // 4. In development/test mode, enforce the ownership contract by freezing the object.
    // This crashes any caller attempting to illegally mutate the fact later, serving as a safety check 
    // without enforcing cloning allocation overhead in production.
    if (process.env.NODE_ENV !== 'production') {
      Object.freeze(fact);
    }

    // 5. Append to sink
    this.sink.append(fact);
  }

  /**
   * @private
   * @param {import('../models/index.mjs').BaseFact} fact 
   */
  _validate(fact) {
    if (!fact || typeof fact !== 'object') {
      throw new Error('Fact must be an object');
    }
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
        throw new Error(`Unsupported fact type: ${fact?.type}`);
    }
  }
}
