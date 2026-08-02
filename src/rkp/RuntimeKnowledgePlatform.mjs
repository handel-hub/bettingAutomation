import fs from 'node:fs/promises';
import path from 'node:path';
import { HybridLogicalClock } from './knowledge/hlc.mjs';
import { HotRingBuffer } from './knowledge/memory.mjs';
import { RuntimeLedger } from './knowledge/ledger.mjs';
import { RuntimeRecorder } from './knowledge/recorder.mjs';
import { ProcessLocalWal } from './storage/wal/ProcessLocalWal.mjs';
import { WalWriterWorker } from './storage/wal/WalWriterWorker.mjs';
import { FlushScheduler } from './storage/wal/FlushScheduler.mjs';
import { RecoveryReader } from './storage/wal/RecoveryReader.mjs';
import { attachTelemetryAdapter } from './integration/TelemetryAdapter.mjs';

class RuntimeKnowledgePlatform {
    constructor() {
        this.hlc = new HybridLogicalClock(() => Date.now());
        // In-memory buffer size. 200,000 facts is extremely generous.
        this.ringBuffer = new HotRingBuffer(200000);
        this.ledger = new RuntimeLedger({ ringBuffer: this.ringBuffer });
        this.recorder = new RuntimeRecorder({ hlc: this.hlc, sink: this.ledger });
        
        this.wal = null;
        this.worker = null;
        this.scheduler = null;
        this.initialized = false;
    }

    async hydrate(dir, prefix) {
        try {
            await fs.mkdir(dir, { recursive: true });
            const files = await fs.readdir(dir);
            const regex = new RegExp(`^${prefix}-(\\d+)\\.rkpwal$`);
            const walFiles = files
                .map(f => {
                    const match = f.match(regex);
                    return match ? { file: f, index: parseInt(match[1], 10) } : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.index - b.index);

            let factsLoaded = 0;
            for (const { file } of walFiles) {
                const reader = new RecoveryReader(path.join(dir, file));
                for await (const fact of reader.read()) {
                    this.ledger.append(fact);
                    factsLoaded++;
                }
            }
            if (factsLoaded > 0) {
                console.log(`[RKP] Hydrated ${factsLoaded} facts from ${walFiles.length} WAL files.`);
            }
        } catch (err) {
            console.error(`[RKP] Hydration failed. Starting cold. Error:`, err);
        }
    }

    async init() {
        if (this.initialized) return;
        
        if (process.env.RKP_ENABLED !== 'false') {
            const dir = process.env.RKP_WAL_DIR || './rkp-wal';
            const prefix = process.env.RKP_WAL_PREFIX || 'node';
            
            await this.hydrate(dir, prefix);

            this.wal = new ProcessLocalWal(dir, prefix);
            await this.wal.init();
            
            this.worker = new WalWriterWorker(this.ledger, this.wal);
            
            this.scheduler = new FlushScheduler(this.worker, this.ledger, {
                intervalMs: 1000,
                highWaterMark: 0.8
            });
            this.scheduler.start();
            
            attachTelemetryAdapter();
        }
        
        this.initialized = true;
    }
}

export const rkp = new RuntimeKnowledgePlatform();
export const globalRecorder = rkp.recorder;
