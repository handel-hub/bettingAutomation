import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import readline from 'node:readline';
import { logger } from '../../../utils/logger.mjs';

/**
 * Append-only Write-Ahead Log (WAL) to survive process crashes during irreversible transactions.
 */
export class RunLedger {
    constructor(walDir = null) {
        this.walDir = walDir || path.resolve(__dirname, '..', '..', '..', '..', 'data', 'wal');
        this.walFilePath = path.join(this.walDir, 'run_ledger.jsonl');
        this._ensureDirectory();
    }

    _ensureDirectory() {
        if (!fs.existsSync(this.walDir)) {
            fs.mkdirSync(this.walDir, { recursive: true });
        }
    }

    /**
     * Appends a state transition for a given run and cycle.
     */
    append(runId, cycleId, accountId, state, result = null) {
        const entry = {
            runId,
            cycleId,
            accountId,
            state,
            result,
            timestamp: Date.now()
        };

        const line = JSON.stringify(entry) + '\n';
        
        try {
            // Synchronous write ensures the log is safely on disk before execution proceeds
            fs.appendFileSync(this.walFilePath, line, 'utf8');
        } catch (err) {
            logger.error(`[RunLedger] Failed to append WAL entry for Run [${runId}]: ${err.message}`);
        }
    }

    /**
     * Reads the entire WAL and identifies any run that reached 'PROCESSING' 
     * but did not reach 'SETTLEMENT'.
     */
    async getUnresolvedRuns() {
        if (!fs.existsSync(this.walFilePath)) {
            return [];
        }

        const runStates = new Map();

        const fileStream = fs.createReadStream(this.walFilePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const entry = JSON.parse(line);
                const { runId, state } = entry;
                
                if (!runStates.has(runId)) {
                    runStates.set(runId, entry);
                } else {
                    // Update state. SETTLEMENT is terminal and overwrites PROCESSING.
                    runStates.set(runId, entry);
                }
            } catch (err) {
                logger.warn(`[RunLedger] Corrupt WAL entry skipped: ${err.message}`);
            }
        }

        const unresolved = [];
        for (const [runId, lastEntry] of runStates.entries()) {
            if (lastEntry.state === 'PROCESSING') {
                unresolved.push(lastEntry);
            }
        }

        return unresolved;
    }
}
