import { logger } from '../../config.mjs';
import { BetCycle } from './BetCycle.mjs';
import crypto from 'node:crypto';

/**
 * AutomationRun
 * Represents the multi-cycle user automation intent. 
 * Snapshots policy, spawns cycles, and evaluates rebet logic.
 */
export class AutomationRun {
    constructor(runId, accountId, policyManager, adapter, simulator, runOrchestrator) {
        this.runId = runId;
        this.accountId = accountId;
        this.adapter = adapter;
        this.simulator = simulator;
        this.runOrchestrator = runOrchestrator;
        
        // Take an immutable snapshot of the current policy
        const livePolicy = policyManager.getPolicy(accountId);
        this.policySnapshot = JSON.parse(JSON.stringify(livePolicy));
        
        this.cycleCount = 0;
        this.activeCycle = null;
        this.state = 'CREATED';
        this.createdAt = Date.now();
    }

    async start(browserObj) {
        this.state = 'ACTIVE';
        logger.info(`[AutomationRun:${this.runId}] Starting run with policy snapshot.`);

        let active = true;

        try {
            while (active) {
                this.cycleCount++;
                const cycleId = crypto.randomUUID();
                logger.info(`[AutomationRun:${this.runId}] Spawning Cycle #${this.cycleCount} [${cycleId}]`);

                this.activeCycle = new BetCycle({
                    runId: this.runId,
                    cycleId,
                    policySnapshot: this.policySnapshot,
                    adapter: this.adapter,
                    simulator: this.simulator,
                    runOrchestrator: this.runOrchestrator
                });

                const result = await this.activeCycle.execute(browserObj);
                
                logger.info(`[AutomationRun:${this.runId}] Cycle [${cycleId}] finished with status: ${result.status}`);

                if (result.status === 'UNCERTAIN') {
                    // Critical failure state. Hand off to Reconciliation.
                    logger.warn(`[AutomationRun:${this.runId}] Cycle resulted in UNCERTAIN state. Aborting run for safety.`);
                    this.state = 'UNCERTAIN';
                    active = false;
                } else if (result.status === 'FAILED') {
                    // Phase 4: Multi-Cycle / Rebet Orchestration
                    const maxAttempts = this.policySnapshot.Rebet?.Strategy?.MaxRebetAttempts ?? 3;
                    if (this.cycleCount < maxAttempts) {
                        logger.info(`[AutomationRun:${this.runId}] Cycle FAILED. Rebet attempt ${this.cycleCount} of ${maxAttempts}. Spawning new cycle...`);
                        // Small delay before spawning next cycle to let DOM settle if it was an odds interrupt
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                        logger.info(`[AutomationRun:${this.runId}] Cycle FAILED. Max rebets (${maxAttempts}) exhausted. Terminating run.`);
                        this.state = 'ABORTED';
                        active = false;
                    }
                } else if (result.status === 'SUCCESS') {
                    // Phase 2/4: Terminate on success, as physical placement intent is satisfied.
                    logger.info(`[AutomationRun:${this.runId}] Cycle SUCCESS. Bet placed successfully. Target achieved.`);
                    this.state = 'COMPLETED';
                    active = false;
                }
            }
        } catch (err) {
            logger.error(`[AutomationRun:${this.runId}] Fatal unhandled exception: ${err.message}`);
            this.state = 'ABORTED';
        }

        return {
            status: this.state,
            cycles: this.cycleCount
        };
    }
}
