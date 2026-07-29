import { describe, it, expect } from 'vitest';
import { RuntimeLedger } from './ledger.mjs';
import { HotRingBuffer } from './memory.mjs';
import { RuntimeRecorder } from './recorder.mjs';
import { HybridLogicalClock } from './hlc.mjs';

describe('Runtime Ledger', () => {
  it('should initialize with a default HotRingBuffer', () => {
    const ledger = new RuntimeLedger();
    expect(ledger.ringBuffer).toBeInstanceOf(HotRingBuffer);
    expect(ledger.ringBuffer.capacity).toBe(10000);
  });

  it('should append facts to the ring buffer and snapshot them', () => {
    const ringBuffer = new HotRingBuffer(5);
    const ledger = new RuntimeLedger({ ringBuffer });
    
    const fact = { id: 1 };
    ledger.append(fact);
    
    expect(ledger.snapshot()).toEqual([fact]);
  });

  it('INTEGRATION: Recorder -> Ledger -> HotRingBuffer', () => {
    const ledger = new RuntimeLedger({ ringBuffer: new HotRingBuffer(5) });
    const hlc = new HybridLogicalClock(() => 2000);
    const recorder = new RuntimeRecorder({ hlc, sink: ledger });
    
    const fact = {
      domain: 'Execution',
      type: 'Decision',
      traceId: 't1',
      spanId: 's1',
      actionTaken: 'PROCEED',
      alternativesDiscarded: [],
      confidenceScore: 1,
      evidence: { constraintsEvaluated: [] }
    };
    
    // The recorder validats, assigns HLC/LSN, and appends to ledger.
    recorder.record(fact);
    
    const snap = ledger.snapshot();
    expect(snap.length).toBe(1);
    
    const recordedFact = snap[0];
    expect(recordedFact.domain).toBe('Execution');
    expect(recordedFact.physicalTime).toBe(2000);
    expect(recordedFact.lsn).toBe(1);
    expect(recordedFact.hlc).toBeDefined();
  });
});
