import { logger } from '../../utils/logger.mjs';
import { globalRecorder } from '../../rkp/RuntimeKnowledgePlatform.mjs';

/**
 * ReconciliationDaemon - Node.js Execution Plane Component
 * Out-of-band daemon that resolves UNCERTAIN execution states by verifying 
 * directly against the target platform's API to prevent double-betting.
 */
export class ReconciliationDaemon {
    /**
     * @param {Map} sequenceMap - In-memory map of active ExecutionSequences
     * @param {Object} platformApiAdapter - Interface for the target platform's API
     */
    constructor(sequenceMap, platformApiAdapter) {
        this.sequenceMap = sequenceMap;
        this.platformApi = platformApiAdapter;
        this.intervalId = null;
        this.isReconciling = false;
    }

    start(intervalMs = 15000) {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.reconcile(), intervalMs);
        logger.info(`[ReconciliationDaemon] Started background reconciliation loop (${intervalMs}ms)`);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async reconcile() {
        if (this.isReconciling) return;

        const uncertainSequences = [];
        for (const [id, seq] of this.sequenceMap.entries()) {
            if (seq.state === 'UNCERTAIN') {
                uncertainSequences.push(seq);
            }
        }

        if (uncertainSequences.length === 0) return;
        
        this.isReconciling = true;
        logger.info(`[ReconciliationDaemon] Found ${uncertainSequences.length} UNCERTAIN sequences. Attempting API reconciliation...`);

        try {
            // Fetch authoritative 'Open Bets' or 'Recent History' from the target platform API
            // This relies on a site-specific adapter provided at runtime
            const recentPlatformBets = await this.platformApi.getRecentHistory();

            for (const seq of uncertainSequences) {
                // Match the sequence against the platform's history.
                // Matching criteria typically involves checking exact stake + timestamp windows.
                const matchedBet = recentPlatformBets.find(b => this._matches(seq, b));

                if (matchedBet) {
                    // The bet successfully registered on the platform despite the browser crashing!
                    seq.state = 'SETTLING';
                    
                    globalRecorder.recordEvent('RECONCILE_OK', {
                        sequenceId: seq.sequenceId,
                        receiptId: matchedBet.receiptId,
                        platformTimestamp: matchedBet.timestamp,
                        action: 'TRANSITION_TO_SETTLING'
                    });
                    
                    logger.info(`[ReconciliationDaemon] Seq [${seq.sequenceId}] RECONCILED OK. Bet was placed successfully.`);
                } else {
                    // The bet was NOT found. We must wait a grace period to account for platform lag.
                    // If 2 minutes have passed since the crash/timeout, we definitively fail it.
                    const ageMs = Date.now() - seq.updatedAt;
                    if (ageMs > 120000) {
                        seq.state = 'TERMINATED';
                        
                        globalRecorder.recordEvent('RECONCILE_FAIL', { 
                            sequenceId: seq.sequenceId,
                            ageMs,
                            action: 'TRANSITION_TO_TERMINATED'
                        });
                        
                        logger.warn(`[ReconciliationDaemon] Seq [${seq.sequenceId}] RECONCILE FAIL. Bet did not register on platform. Terminated.`);
                    }
                }
            }
        } catch (err) {
            logger.error(`[ReconciliationDaemon] Platform API fetch failed during reconciliation: ${err.message}`);
            // We do NOT change state on fetch errors. We retry next loop.
        } finally {
            this.isReconciling = false;
        }
    }

    _matches(sequence, platformBet) {
        // Example deterministic matching logic
        // E.g., The stake must match exactly, and the timestamp must be within a few seconds of our attempt
        return platformBet.stakeCents === sequence.selectedStake &&
               Math.abs(platformBet.timestamp - sequence.updatedAt) < 30000;
    }
}
