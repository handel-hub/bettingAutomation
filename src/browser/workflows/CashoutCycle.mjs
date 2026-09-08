import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';
import { forensicLogger } from '../forensics/ForensicLogger.mjs';

/**
 * CashoutCycle
 * Owns the physical execution of a single cashout attempt on an account.
 * Manages active cycle lease with RunOrchestrator, executes ATOMIC_CASHOUT,
 * and determines terminal status: SUCCESS, FAILED, ABORTED, or UNCERTAIN.
 */
export class CashoutCycle {
    constructor({ runId, cycleId, betId, targetSelector, simulator, runOrchestrator }) {
        this.runId = runId;
        this.cycleId = cycleId;
        this.betId = betId || null;
        this.targetSelector = targetSelector || null;
        this.simulator = simulator;
        this.runOrchestrator = runOrchestrator;
        this.state = 'CREATED';
    }

    async execute(browserObj) {
        const { id } = browserObj;
        const cycleStartTime = Date.now();
        forensicLogger.log('CASHOUT_CYCLE_START', { runId: this.runId, cycleId: this.cycleId, accountId: id, betId: this.betId });
        logger.info(`[CashoutCycle:${this.cycleId}] Starting Cashout on [${id}] for bet [${this.betId || 'first-available'}]`);

        try {
            // Activate transactional cycle in RunOrchestrator
            if (this.runOrchestrator) {
                this.runOrchestrator.setActiveCycle(this.runId, this.cycleId);
            }
            this.state = 'PROCESSING';

            const atomicCommand = new Command({
                category: 'Execution',
                type: 'ATOMIC_CASHOUT',
                payload: {
                    selector: 'body',
                    betId: this.betId,
                    targetSelector: this.targetSelector,
                    confirmTimeoutMs: 5000,
                    resultTimeoutMs: 12000,
                    idempotent: false
                },
                source: 'CashoutCycle',
                runId: this.runId,
                cycleId: this.cycleId,
                idempotent: false
            });

            await this.simulator.execute(browserObj, atomicCommand);
            this.state = 'SETTLEMENT';
            forensicLogger.log('CASHOUT_CYCLE_COMPLETE', { runId: this.runId, cycleId: this.cycleId, accountId: id, status: 'SUCCESS', duration: Date.now() - cycleStartTime });
            logger.info(`[CashoutCycle:${this.cycleId}] Cashout completed successfully on [${id}].`);
            return { status: 'SUCCESS', detail: 'Cashout settled successfully' };

        } catch (err) {
            const msg = err.message || '';
            logger.error(`[CashoutCycle:${this.cycleId}] Cashout failed on [${id}]: ${msg}`);
            forensicLogger.log('CASHOUT_CYCLE_ERROR', { runId: this.runId, cycleId: this.cycleId, accountId: id, error: msg, duration: Date.now() - cycleStartTime });

            if (msg.includes('ATOMIC-UNKNOWN')) {
                this.state = 'UNCERTAIN';
                return { status: 'UNCERTAIN', detail: msg };
            }

            if (msg.includes('ATOMIC-ABORT')) {
                this.state = 'ABORTED';
                return { status: 'ABORTED', detail: msg };
            }

            if (msg.includes('ATOMIC-FAILED')) {
                this.state = 'FAILED';
                return { status: 'FAILED', detail: msg };
            }

            // If an unexpected error occurred during or after processing, assume UNCERTAIN to protect funds
            if (this.state === 'PROCESSING' || this.state === 'SETTLEMENT') {
                return { status: 'UNCERTAIN', detail: `Unexpected fault during cashout processing: ${msg}` };
            }

            return { status: 'FAILED', detail: msg };

        } finally {
            if (this.runOrchestrator) {
                this.runOrchestrator.clearActiveCycle(this.runId);
            }
        }
    }
}
