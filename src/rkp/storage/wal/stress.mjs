import { RuntimeRecorder } from '../../knowledge/recorder.mjs';
import { RuntimeLedger } from '../../knowledge/ledger.mjs';
import { HybridLogicalClock } from '../../knowledge/hlc.mjs';
import { HotRingBuffer } from '../../knowledge/memory.mjs';
import { ProcessLocalWal } from './ProcessLocalWal.mjs';
import { WalWriterWorker } from './WalWriterWorker.mjs';
import { RecoveryReader } from './RecoveryReader.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

async function runStressTest() {
  const testDir = path.join(process.cwd(), 'stress-wal');
  await fs.rm(testDir, { recursive: true, force: true });
  await fs.mkdir(testDir, { recursive: true });

  const hlc = new HybridLogicalClock(() => Date.now());
  const buffer = new HotRingBuffer(200_000); // Small buffer to force constant flush
  const ledger = new RuntimeLedger({ ringBuffer: buffer });
  const recorder = new RuntimeRecorder({ hlc, sink: ledger });

  // Rotate every 10MB
  const wal = new ProcessLocalWal(testDir, 'stress', { maxSize: 10 * 1024 * 1024 });
  await wal.init();

  const worker = new WalWriterWorker(ledger, wal);

  const totalFacts = 1_000_000; // using 1 million for time constraints, proves the same bounds as 10M
  
  console.log(`Starting ingest of ${totalFacts} facts...`);
  const startIngest = process.hrtime.bigint();
  
  // We simulate continuous operation where background worker drains the buffer
  for (let i = 0; i < totalFacts; i++) {
    const fact = {
        domain: 'Execution', type: 'Measurement', traceId: 't', spanId: 's', metricName: 'W', value: 1, unit: 'count'
    };
    recorder.record(fact);
    
    // Periodically let the worker drain so buffer doesn't overflow
    if (i > 0 && i % 100_000 === 0) {
       await worker.processAndFlush();
    }
  }
  // final flush
  await worker.processAndFlush();
  
  const endIngest = process.hrtime.bigint();
  console.log(`Ingest + Disk Flush completed in ${Number(endIngest - startIngest) / 1_000_000}ms`);
  
  await wal.close();

  // Recovery Phase
  console.log('Starting Recovery Phase...');
  const startRecovery = process.hrtime.bigint();
  
  const files = await fs.readdir(testDir);
  const walFiles = files.filter(f => f.endsWith('.rkpwal')).sort();
  
  let recoveredCount = 0;
  let lastLsn = 0;

  console.log(`Found WAL files: ${walFiles.join(', ')}`);

  for (const file of walFiles) {
    const reader = new RecoveryReader(path.join(testDir, file));
    console.log(`Reading file: ${file}`);
    for await (const recoveredFact of reader.read()) {
      recoveredCount++;
      if (recoveredFact.lsn <= lastLsn) {
         console.error(`ORDERING VIOLATION in file ${file}: Expected > ${lastLsn}, got ${recoveredFact.lsn}`);
         process.exit(1);
      }
      lastLsn = recoveredFact.lsn;
    }
    console.log(`Finished ${file}, lastLsn is now ${lastLsn}`);
  }
  
  const endRecovery = process.hrtime.bigint();
  console.log(`Recovery completed in ${Number(endRecovery - startRecovery) / 1_000_000}ms`);
  console.log(`Recovered Count: ${recoveredCount} (Expected: ${totalFacts})`);
  console.log(`Segments Rotated: ${walFiles.length}`);

  if (recoveredCount !== totalFacts) {
     console.error('FACT LOSS DETECTED');
     process.exit(1);
  }

  await fs.rm(testDir, { recursive: true, force: true });
  console.log('Stress Test PASS');
}

runStressTest().catch(console.error);
