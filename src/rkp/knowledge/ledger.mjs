import { HotRingBuffer } from './memory.mjs';

/**
 * The RuntimeLedger is the primary in-memory sink for all RuntimeFacts.
 * In Phase 1, it acts solely as a facade over the HotRingBuffer.
 * In future phases, it will coordinate asynchronous flushes to the Write-Ahead Log (WAL).
 */
export class RuntimeLedger {
  /**
   * @param {Object} [options]
   * @param {HotRingBuffer} [options.ringBuffer]
   */
  constructor({ ringBuffer = new HotRingBuffer(10000) } = {}) {
    this.ringBuffer = ringBuffer;
  }

  /**
   * Appends a fact to the ledger's hot ring buffer.
   * This is the true zero-allocation fast path sink.
   * 
   * @param {import('../models/index.mjs').BaseFact} fact 
   */
  append(fact) {
    this.ringBuffer.append(fact);
  }

  /**
   * Retrieves an ordered snapshot of all facts currently in the ledger memory.
   * 
   * @returns {import('../models/index.mjs').BaseFact[]}
   */
  snapshot() {
    return this.ringBuffer.snapshot();
  }
}
