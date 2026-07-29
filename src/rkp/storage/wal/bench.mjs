import { RuntimeRecorder } from '../../knowledge/recorder.mjs';
import { RuntimeLedger } from '../../knowledge/ledger.mjs';
import { HybridLogicalClock } from '../../knowledge/hlc.mjs';
import { HotRingBuffer } from '../../knowledge/memory.mjs';
import { ProcessLocalWal } from './ProcessLocalWal.mjs';
import { WalWriterWorker } from './WalWriterWorker.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

async function runWalBenchmark() {
  const testDir = path.join(process.cwd(), 'benchmark-wal');
  await fs.mkdir(testDir, { recursive: true });

  const hlc = new HybridLogicalClock(() => Date.now());
  const buffer = new HotRingBuffer(500000); // large buffer for burst
  const ledger = new RuntimeLedger({ ringBuffer: buffer });
  const recorder = new RuntimeRecorder({ hlc, sink: ledger });

  const wal = new ProcessLocalWal(testDir, 'bench', { maxSize: 100 * 1024 * 1024 });
  await wal.init();

  const worker = new WalWriterWorker(ledger, wal);

  const iterations = 500_000;
  
  // 1. Record Facts (Hot Path)
  const fact = {
      domain: 'Execution', type: 'Measurement', traceId: 't', spanId: 's', metricName: 'W', value: 1, unit: 'count'
  };

  const startHot = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    recorder.record(fact);
  }
  const endHot = process.hrtime.bigint();
  const hotElapsedMs = Number(endHot - startHot) / 1_000_000;

  // 2. Flush to Disk (Background Path)
  const startDisk = process.hrtime.bigint();
  await worker.processAndFlush();
  const endDisk = process.hrtime.bigint();
  const diskElapsedMs = Number(endDisk - startDisk) / 1_000_000;

  console.log(JSON.stringify({
    iterations,
    hotPathOpsPerSec: Math.floor(iterations / (hotElapsedMs / 1000)),
    diskOpsPerSec: Math.floor(iterations / (diskElapsedMs / 1000)),
    diskElapsedMs
  }));

  await wal.close();
  await fs.rm(testDir, { recursive: true, force: true });
}

runWalBenchmark();
