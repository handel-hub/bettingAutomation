import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';
import { ConstraintEngine } from '../execution/ConstraintEngine.mjs';

/**
 * BetCycle
 * Represents a single physical submission attempt to the target platform.
 * Owns physical execution (typing, pre-flight checks, physical click) and observes the immediate DOM result.
 */
export class BetCycle {
    constructor({ runId, cycleId, policySnapshot, adapter, simulator, runOrchestrator }) {
        this.runId = runId;
        this.cycleId = cycleId;
        this.policy = policySnapshot;
        this.adapter = adapter;
        this.simulator = simulator;
        this.runOrchestrator = runOrchestrator;
        
        this.state = 'CREATED';
    }

    async execute(browserObj) {
        const { id, page } = browserObj;
        
        try {
            // Phase 5: Execution UI Protection (Locking the DOM from manual user clicks during Cycle)
            await page.evaluate(() => {
                if (!document.getElementById('__auto_lock')) {
                    const target = document.querySelector('.m-fast-betslip-wrap') || document.querySelector('.m-betslips') || document.body;
                    const div = document.createElement('div');
                    div.id = '__auto_lock';
                    div.style.position = 'absolute';
                    div.style.top = '0';
                    div.style.left = '0';
                    div.style.width = '100%';
                    div.style.height = '100%';
                    div.style.zIndex = '999999';
                    div.style.backgroundColor = 'transparent'; // Invisible but absorbs clicks
                    if (getComputedStyle(target).position === 'static') {
                        target.style.position = 'relative';
                    }
                    target.appendChild(div);
                }
            }).catch(() => {});

            logger.info(`[Cycle:${this.cycleId}] Checking Session & Balance...`);
            const sessionState = await this.adapter.getSessionState(page);
            if (sessionState !== 'SESSION_ACTIVE') {
                return { status: 'FAILED', detail: 'Session EXPIRED' };
            }

            const balance = await this.adapter.getBalance(page);

            logger.info(`[Cycle:${this.cycleId}] Opening Betslip...`);
            const openCmdRaw = await this.adapter.translateOpenBetslip(page);
            await this.simulator.execute(browserObj, this._toCommand(openCmdRaw, true));
            
            await page.waitForTimeout(500);

            let liveOdds = null;
            try {
                liveOdds = await this.adapter.readCurrentOdds(page);
            } catch (err) {
                logger.warn(`[Cycle:${this.cycleId}] Could not parse live odds, assuming FIXED mode or default.`);
            }

            this.state = 'STAKE_PREPARATION';
            logger.info(`[Cycle:${this.cycleId}] Evaluating Policy Snapshot (Traceability ON)...`);
            const decision = ConstraintEngine.evaluate(this.policy, balance, liveOdds);
            
            if (decision.status !== 'AUTHORIZED') {
                logger.error(`[Cycle:${this.cycleId}] Rejected execution (Status: ${decision.status}).`);
                return { status: 'FAILED', detail: `Policy Rejected: ${decision.status}` };
            }

            const stakeAmount = decision.stake;
            logger.info(`[Cycle:${this.cycleId}] Inputting Authorized Stake: ${stakeAmount}...`);
            const stakeCmds = this.adapter.translateStake(stakeAmount);
            for (const cmdRaw of stakeCmds) {
                await this.simulator.execute(browserObj, this._toCommand(cmdRaw, true));
            }

            this.state = 'READY_TO_SUBMIT';
            
            // Phase 3: Immediate Pre-Flight Strict Validation (TOCTOU)
            logger.info(`[Cycle:${this.cycleId}] Checking for Policy Interrupts (Odds banners)...`);
            const interrupt = await this.adapter.checkInterrupts(page);
            
            if (interrupt.status === 'INTERRUPT_REQUIRED') {
                logger.warn(`[Cycle:${this.cycleId}] Interrupt detected: ${interrupt.detail}`);
                if (this.policy.RiskManagement.Policy.AutoAcceptOddsChanges) {
                    logger.info(`[Cycle:${this.cycleId}] Policy allows auto-accept. Clearing banner for next cycle...`);
                    const acceptCmdRaw = this.adapter.translateAcceptOdds();
                    await this.simulator.execute(browserObj, this._toCommand(acceptCmdRaw, true));
                }
                // The cycle must fail regardless so AutomationRun recalculates the math on the new odds!
                return { status: 'FAILED', detail: 'Cycle aborted due to odds change interruption.' };
            }

            logger.info(`[Cycle:${this.cycleId}] Executing strict TOCTOU validation natively in Browser...`);

            // Explicitly set the active cycle in RunOrchestrator to unlock idempotent:false execution
            if (this.runOrchestrator) {
                this.runOrchestrator.setActiveCycle(this.runId, this.cycleId);
            }

            this.state = 'PROCESSING';
            logger.info(`[Cycle:${this.cycleId}] Submitting Bet (Atomic)...`);
            const placeCmdRaw = this.adapter.translateAtomicPlaceBet(liveOdds);
            
            // Idempotent: false is structurally forced by the Adapter here, requiring the lease.
            try {
                await this.simulator.execute(browserObj, this._toCommand(placeCmdRaw, false));
            } catch (err) {
                if (err.message && err.message.includes('ATOMIC-ABORT')) {
                    logger.warn(`[Cycle:${this.cycleId}] TOCTOU FAULT: ${err.message}`);
                    return { status: 'FAILED', detail: `TOCTOU Mismatch: ${err.message}` };
                }
                throw err;
            }

            this.state = 'SETTLEMENT';
            logger.info(`[Cycle:${this.cycleId}] Waiting for Result (Timeout: ${this.policy.Execution.Timeouts.ResultTimeoutMs}ms)...`);
            const result = await this.adapter.observeResult(page, this.policy.Execution.Timeouts.ResultTimeoutMs);

            if (result.status === 'SUCCESS') {
                return { status: 'SUCCESS', detail: 'Bet placed successfully.' };
            } else if (result.status === 'FAILED') {
                return { status: 'FAILED', detail: 'Bet explicitly failed.' };
            } else {
                return { status: 'UNCERTAIN', detail: result.detail };
            }
        } catch (error) {
            logger.error(`[Cycle:${this.cycleId}] Unhandled cycle fault: ${error.message}`);
            // Any fault *after* placing bet must be treated as UNCERTAIN to prevent double-spending
            if (this.state === 'PROCESSING' || this.state === 'SETTLEMENT') {
                return { status: 'UNCERTAIN', detail: `Fault during processing: ${error.message}` };
            }
            return { status: 'FAILED', detail: error.message };
        } finally {
            if (this.runOrchestrator) {
                this.runOrchestrator.clearActiveCycle(this.runId);
            }
            
            // Phase 5: Release UI Protection
            await page.evaluate(() => {
                const lock = document.getElementById('__auto_lock');
                if (lock) lock.remove();
            }).catch(() => {});
        }
    }

    _toCommand(rawObj, forceIdempotent = true) {
        return new Command({
            category: 'Execution',
            type: rawObj.type,
            payload: rawObj.payload,
            source: 'BetCycle',
            runId: this.runId,
            cycleId: this.cycleId,
            idempotent: rawObj.payload?.idempotent ?? forceIdempotent
        });
    }
}
