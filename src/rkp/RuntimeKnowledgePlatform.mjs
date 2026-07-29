import { HybridLogicalClock } from './knowledge/hlc.mjs';
import { HotRingBuffer } from './knowledge/memory.mjs';
import { RuntimeLedger } from './knowledge/ledger.mjs';
import { RuntimeRecorder } from './knowledge/recorder.mjs';
import { ProcessLocalWal } from './storage/wal/ProcessLocalWal.mjs';
import { WalWriterWorker } from './storage/wal/WalWriterWorker.mjs';
import { FlushScheduler } from './storage/wal/FlushScheduler.mjs';
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

    async init() {
        if (this.initialized) return;
        
        if (process.env.RKP_ENABLED !== 'false') {
            const dir = process.env.RKP_WAL_DIR || './rkp-wal';
            this.wal = new ProcessLocalWal(dir);
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
