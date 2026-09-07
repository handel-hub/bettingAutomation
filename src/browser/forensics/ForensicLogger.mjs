import { performance } from 'perf_hooks';
import fs from 'node:fs';
import path from 'node:path';

class ForensicLogger {
    constructor() {
        this.runId = `FR-${new Date().toISOString().replace(/[-:T]/g, '').slice(0,14)}-${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`;
        this.logFile = path.resolve(process.cwd(), `forensic_trace_${this.runId}.jsonl`);
        this.events = [];
    }

    log(eventName, data = {}) {
        const entry = {
            eventName,
            timestamp: Date.now(),
            monotonicTime: performance.now(),
            forensicRunId: this.runId,
            ...data
        };
        
        // Console output for immediate feedback
        const timeStr = new Date(entry.timestamp).toISOString().split('T')[1];
        console.log(`[${timeStr}] [${eventName}] ${JSON.stringify(data)}`);
        
        this.events.push(entry);
        try {
            fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
        } catch (err) {}
    }

    getEvents() {
        return this.events;
    }
}

export const forensicLogger = new ForensicLogger();
