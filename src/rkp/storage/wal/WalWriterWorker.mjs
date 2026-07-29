import { Serializer } from './Serializer.mjs';
import { ProcessLocalWal } from './ProcessLocalWal.mjs';

/**
 * The background worker responsible for serializing facts and passing them to the WAL.
 * Operates independently from the RuntimeRecorder to preserve zero-allocation hot paths.
 */
export class WalWriterWorker {
  /**
   * @param {import('../../knowledge/ledger.mjs').RuntimeLedger} ledger 
   * @param {ProcessLocalWal} wal 
   */
  constructor(ledger, wal) {
    this.ledger = ledger;
    this.wal = wal;
    this.lastWrittenLsn = 0;
  }

  /**
   * Reads from the ledger, serializes new facts, appends to the WAL, and flushes to disk.
   */
  async processAndFlush() {
    // 1. Take snapshot of memory
    // (This allocates a new array, but it runs on the background interval, not the hot path)
    const snapshot = this.ledger.snapshot();
    if (snapshot.length === 0) return;

    // 2. Filter for unwritten facts
    // We rely on strictly monotonic Local Sequence Numbers (LSN)
    const newFacts = snapshot.filter(fact => fact.lsn > this.lastWrittenLsn);
    
    if (newFacts.length === 0) return;

    // 3. Serialize and append
    let needsRotation = false;
    for (let i = 0; i < newFacts.length; i++) {
      const fact = newFacts[i];
      if (fact.lsn === 100001 || fact.lsn === 100002) {
         // console.log(`Writing LSN ${fact.lsn}, current lastWrittenLsn: ${this.lastWrittenLsn}`);
      }
      const frameBuf = Serializer.serializeFrame(fact);
      
      this.wal.append(frameBuf);
      if (this.wal.needsRotation()) needsRotation = true;
      
      this.lastWrittenLsn = fact.lsn;
    }

    if (newFacts.length > 0) {
      console.log(`WalWriterWorker writing ${newFacts.length} facts. First LSN: ${newFacts[0].lsn}, Last LSN: ${newFacts[newFacts.length-1].lsn}`);
    }

    // 4. Force OS buffer flush (wait for drain)
    await this.wal.flush();

    // 5. Rotate if high-water mark crossed
    if (needsRotation) {
      await this.wal.rotate();
    }
  }
}
