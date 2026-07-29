import { RuntimeRecorder } from '../knowledge/recorder.mjs';
import { RuntimeLedger } from '../knowledge/ledger.mjs';
import { HybridLogicalClock } from '../knowledge/hlc.mjs';
import { HotRingBuffer } from '../knowledge/memory.mjs';

function runBenchmark() {
  const hlc = new HybridLogicalClock(() => Date.now());
  const buffer = new HotRingBuffer(10000);
  const ledger = new RuntimeLedger({ ringBuffer: buffer });
  const recorder = new RuntimeRecorder({ hlc, sink: ledger });

  const iterations = 1_000_000;
  
  // Warmup
  for (let i = 0; i < 10000; i++) {
    recorder.record({
      domain: 'Execution', type: 'Measurement', traceId: 't', spanId: 's', metricName: 'W', value: 1, unit: 'count'
    });
  }

  // Benchmark
  const start = process.hrtime.bigint();
  
  // We reuse the object to simulate zero-allocation on the caller side
  const fact = {
      domain: 'Execution', type: 'Measurement', traceId: 't', spanId: 's', metricName: 'W', value: 1, unit: 'count'
  };

  for (let i = 0; i < iterations; i++) {
    recorder.record(fact);
  }

  const end = process.hrtime.bigint();
  const elapsedMs = Number(end - start) / 1_000_000;
  const opsPerSec = Math.floor(iterations / (elapsedMs / 1000));
  
  console.log(JSON.stringify({
    iterations,
    elapsedMs,
    opsPerSec,
    avgLatencyNs: (elapsedMs * 1_000_000) / iterations
  }));
}

runBenchmark();
