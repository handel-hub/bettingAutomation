import { RuntimeRecorder } from '../../knowledge/recorder.mjs';
import { RuntimeLedger } from '../../knowledge/ledger.mjs';
import { HybridLogicalClock } from '../../knowledge/hlc.mjs';
import { HotRingBuffer } from '../../knowledge/memory.mjs';
import { ProcessLocalWal } from './ProcessLocalWal.mjs';
import { WalWriterWorker } from './WalWriterWorker.mjs';
import { RecoveryReader } from './RecoveryReader.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

async function runMiniTest() {
  const testDir = path.join(process.cwd(), 'mini-wal');
  await fs.rm(testDir, { recursive: true, force: true });
  await fs.mkdir(testDir, { recursive: true });

  const wal = new ProcessLocalWal(testDir, 'mini', { maxSize: 100 });
  await wal.init();

  const hlc = new HybridLogicalClock(() => Date.now());
  const ledger = new RuntimeLedger({ ringBuffer: new HotRingBuffer(200000) });
  const recorder = new RuntimeRecorder({ hlc, sink: ledger });
  const worker = new WalWriterWorker(ledger, wal);

  // Write 100001 facts
  for (let i = 0; i < 100001; i++) {
    recorder.record({ domain: 'Execution', type: 'Measurement', traceId: 't', spanId: 's', metricName: 'W', value: 1, unit: 'count' });
  }
  await worker.processAndFlush();

  await wal.close();

  const files = await fs.readdir(testDir);
  console.log('Files:', files);
  for (const f of files) {
    const stat = await fs.stat(path.join(testDir, f));
    console.log(`${f}: ${stat.size} bytes`);
  }
}

runMiniTest().catch(console.error);
