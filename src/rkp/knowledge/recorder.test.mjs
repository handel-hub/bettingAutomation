import { describe, it, expect, vi } from 'vitest';
import { RuntimeRecorder } from './recorder.mjs';
import { HybridLogicalClock } from './hlc.mjs';

describe('Runtime Recorder', () => {
  it('should validate and append a valid fact to the sink', () => {
    const sink = { append: vi.fn() };
    const hlc = new HybridLogicalClock(() => 1000);
    const recorder = new RuntimeRecorder({ hlc, sink });

    const fact = {
      domain: 'Network',
      type: 'Measurement',
      traceId: 't1',
      spanId: 's1',
      metricName: 'Latency',
      value: 50,
      unit: 'ms'
    };

    recorder.record(fact);

    expect(sink.append).toHaveBeenCalledTimes(1);
    const appendedFact = sink.append.mock.calls[0][0];
    
    expect(appendedFact.hlc).toBeDefined();
    expect(appendedFact.physicalTime).toBe(1000);
    expect(appendedFact.lsn).toBe(1);
  });

  it('should increment LSN for each recorded fact', () => {
    const sink = { append: vi.fn() };
    const recorder = new RuntimeRecorder({ sink });

    const fact1 = {
      domain: 'Network', type: 'Measurement', traceId: 't1', spanId: 's1',
      metricName: 'Latency', value: 50, unit: 'ms'
    };
    const fact2 = {
      domain: 'Network', type: 'Measurement', traceId: 't1', spanId: 's2',
      metricName: 'Bytes', value: 1024, unit: 'bytes'
    };

    recorder.record(fact1);
    recorder.record(fact2);

    expect(sink.append.mock.calls[0][0].lsn).toBe(1);
    expect(sink.append.mock.calls[1][0].lsn).toBe(2);
  });

  it('should throw on invalid facts and not append to sink', () => {
    const sink = { append: vi.fn() };
    const recorder = new RuntimeRecorder({ sink });

    const invalidFact = {
      domain: 'Invalid',
      type: 'Decision'
    };

    expect(() => recorder.record(invalidFact)).toThrow(/Invalid domain/);
    expect(sink.append).not.toHaveBeenCalled();
  });
});
