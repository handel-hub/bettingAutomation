import { logger } from '../../config.mjs';
import { BetCycle } from './BetCycle.mjs';
import crypto from 'node:crypto';
import { Command } from '../execution/Command.mjs';

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
        this.successCount = 0;
        this.consecutiveFailures = 0;
        this.activeCycle = null;
        this.isNextCycleRebet = false;
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
                    runOrchestrator: this.runOrchestrator,
                    isRebetContinuation: this.isNextCycleRebet,
                    rebetSequenceIndex: this.successCount
                });
                
                // Reset the flag immediately after consuming it
                this.isNextCycleRebet = false;

                const result = await this.activeCycle.execute(browserObj);
                
                logger.info(`[AutomationRun:${this.runId}] Cycle [${cycleId}] finished with status: ${result.status}`);

                if (result.status === 'UNCERTAIN') {
                    // Critical failure state. Hand off to Reconciliation.
                    logger.warn(`[AutomationRun:${this.runId}] Cycle resulted in UNCERTAIN state. Aborting run for safety.`);
                    this.state = 'UNCERTAIN';
                    active = false;
                } else if (result.status === 'FAILED') {
                    this.consecutiveFailures++;
                    // Use Execution Retries as the circuit breaker for domain/execution faults, NOT Rebet Attempts
                    const maxFailures = this.policySnapshot.Execution?.Retries?.MaxExecutionRetries ?? 3;
                    
                    if (this.consecutiveFailures <= maxFailures) {
                        logger.info(`[AutomationRun:${this.runId}] Cycle FAILED. Retry attempt ${this.consecutiveFailures} of ${maxFailures}. Spawning new cycle...`);
                        // Small delay before spawning next cycle to let DOM settle if it was an odds interrupt
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                        logger.info(`[AutomationRun:${this.runId}] Cycle FAILED. Max retries (${maxFailures}) exhausted. Terminating run.`);
                        this.state = 'ABORTED';
                        active = false;
                    }
                } else if (result.status === 'SUCCESS') {
                    this.successCount++;
                    this.consecutiveFailures = 0; // Reset circuit breaker on success
                    
                    // MaxRebetAttempts defines how many times we click the "Rebet" button after the initial bet
                    const maxRebets = this.policySnapshot.Rebet?.Strategy?.MaxRebetAttempts ?? 0;
                    const targetTotalBets = 1 + maxRebets;

                    if (this.successCount < targetTotalBets) {
                        logger.info(`[AutomationRun:${this.runId}] Cycle SUCCESS. Target not yet reached (${this.successCount}/${targetTotalBets} total bets). Initiating autonomous rebet.`);
                        
                        const rebetCmdRaw = this.adapter.translateRebet();
                        const rebetCmd = new Command({
                            category: 'Execution',
                            type: rebetCmdRaw.type,
                            payload: rebetCmdRaw.payload,
                            source: 'AutomationRun',
                            runId: this.runId,
                            idempotent: true,
                            ttlMs: rebetCmdRaw.payload?.locatorTimeout ? rebetCmdRaw.payload.locatorTimeout + 1000 : undefined
                        });
                        
                        try {
                            await this.simulator.execute(browserObj, rebetCmd);
                            // Signal the next cycle to robustly verify the DOM instead of waiting blindly
                            this.isNextCycleRebet = true;
                        } catch (err) {
                            logger.warn(`[AutomationRun:${this.runId}] Failed to click Rebet (err: ${err.message}). Falling back to OK and terminating cycle loop.`);
                            const okCmdRaw = this.adapter.translateDismissSuccess();
                            const okCmd = new Command({
                                category: 'Execution',
                                type: okCmdRaw.type,
                                payload: okCmdRaw.payload,
                                source: 'AutomationRun',
                                runId: this.runId,
                                idempotent: true,
                                ttlMs: okCmdRaw.payload?.locatorTimeout ? okCmdRaw.payload.locatorTimeout + 1000 : undefined
                            });
                            try { await this.simulator.execute(browserObj, okCmd); } catch(e){}
                            this.state = 'COMPLETED';
                            active = false;
                        }
                    } else {
                        // Phase 2/4: Terminate on success, as physical placement intent is satisfied.
                        logger.info(`[AutomationRun:${this.runId}] Cycle SUCCESS. Target achieved (${this.successCount}/${targetTotalBets} total bets). Closing overlay and terminating.`);
                        
                        const okCmdRaw = this.adapter.translateDismissSuccess();
                        const okCmd = new Command({
                            category: 'Execution',
                            type: okCmdRaw.type,
                            payload: okCmdRaw.payload,
                            source: 'AutomationRun',
                            runId: this.runId,
                            idempotent: true,
                            ttlMs: okCmdRaw.payload?.locatorTimeout ? okCmdRaw.payload.locatorTimeout + 1000 : undefined
                        });
                        
                        await this.simulator.execute(browserObj, okCmd);
                        
                        this.state = 'COMPLETED';
                        active = false;
                    }
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
