/**
 * Decides when to flush facts from the RuntimeLedger to the WAL.
 * Operates entirely outside the critical hot path.
 */
export class FlushScheduler {
  /**
   * @param {import('./WalWriterWorker.mjs').WalWriterWorker} worker 
   * @param {import('../../knowledge/ledger.mjs').RuntimeLedger} ledger 
   * @param {Object} [options]
   * @param {number} [options.intervalMs] - Background time-based flush interval
   * @param {number} [options.highWaterMark] - Ratio (0 to 1) indicating buffer fullness threshold
   */
  constructor(worker, ledger, options = {}) {
    this.worker = worker;
    this.ledger = ledger;
    this.intervalMs = options.intervalMs || 500;
    this.highWaterMark = options.highWaterMark || 0.8;
    this.timer = null;
    this.isFlushing = false;
  }

  /**
   * Starts the time-based background flush loop.
   */
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.checkAndFlush(), this.intervalMs);
  }

  /**
   * Stops the background flush loop.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Manual flush trigger (useful for testing or shutdown).
   */
  async flushNow() {
    return this._doFlush();
  }

  /**
   * Periodically invoked to determine if a flush is needed.
   * Can also be called synchronously if a high-water mark event triggers it.
   */
  async checkAndFlush() {
    if (this.isFlushing) return; // Prevent concurrent flush interleaving
    
    // Check fullness (this is an approximation for high-water marks)
    const capacity = this.ledger.ringBuffer.capacity;
    const { head, tail, isFull } = this.ledger.ringBuffer;
    
    let used = 0;
    if (isFull) used = capacity;
    else if (head >= tail) used = head - tail;
    else used = capacity - (tail - head);

    const fullness = used / capacity;
    
    // We flush if time-triggered (called via setInterval) or if exceeding highWaterMark
    await this._doFlush();
  }

  async _doFlush() {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      await this.worker.processAndFlush();
    } catch (err) {
      console.error('WAL Flush Error:', err);
    } finally {
      this.isFlushing = false;
    }
  }
}
