import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';
import { ConstraintEngine } from '../execution/ConstraintEngine.mjs';
import { forensicLogger } from '../forensics/ForensicLogger.mjs';

/**
 * BetCycle
 * Represents a single physical submission attempt to the target platform.
 * Owns physical execution (typing, pre-flight checks, physical click) and observes the immediate DOM result.
 */
export class BetCycle {
    constructor({ runId, cycleId, policySnapshot, adapter, simulator, runOrchestrator, isRebetContinuation = false }) {
        this.runId = runId;
        this.cycleId = cycleId;
        this.policy = policySnapshot;
        this.adapter = adapter;
        this.simulator = simulator;
        this.runOrchestrator = runOrchestrator;
        this.isRebetContinuation = isRebetContinuation;
        
        this.state = 'CREATED';
    }

    async _captureState(page, moment, bId) {
        try {
            const state = await page.evaluate(() => {
                const stakeEl = document.querySelector('.m-fast-betslip-wrap .m-betslips-stake .m-keybord-input') || document.querySelector('.m-input') || document.querySelector('input[type="number"]');
                const oddsEl = document.querySelector('.m-value') || document.querySelector('.m-outcome-odds');
                const wrap = document.querySelector('.m-fast-betslip-wrap');
                const pb = document.querySelector('.m-btn-place');
                const conf = document.querySelector('.m-btn-confirm') || document.querySelector('.af-button--primary');
                return {
                    stakeDOMValue: stakeEl ? (stakeEl.value !== undefined ? stakeEl.value : stakeEl.innerText) : null,
                    oddsDOMValue: oddsEl ? oddsEl.innerText : null,
                    betslipVisibility: wrap ? wrap.getBoundingClientRect().height > 0 : false,
                    placeBetButtonState: pb ? (pb.disabled ? 'disabled' : 'enabled') : 'missing',
                    confirmButtonState: conf ? (conf.disabled ? 'disabled' : 'enabled') : 'missing',
                    loginIndicators: !!document.querySelector('.m-user-avatar')
                };
            }).catch(() => ({ error: 'evaluate failed' }));
            
            forensicLogger.log('DOM_STATE_SNAPSHOT', { moment, cycleId: this.cycleId, accountId: bId, state });
        } catch(e) {}
    }

    _logStateTransition(newState, bId) {
        forensicLogger.log(newState, { cycleId: this.cycleId, accountId: bId, browserId: bId, previousState: this.state, timestamp: Date.now() });
        this.state = newState;
    }

    async execute(browserObj) {
        const { id, page } = browserObj;
        const bId = id;
        const cycleStartTime = Date.now();
        
        forensicLogger.log('BETCYCLE_START', { cycleId: this.cycleId, accountId: id, browserId: id });
        await this._captureState(page, 'A. Before BetCycle starts', id);

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

            forensicLogger.log('SESSION_CHECK_START', { cycleId: this.cycleId, accountId: id });
            logger.info(`[Cycle:${this.cycleId}] Checking Session & Balance...`);
            const sessionState = await this.adapter.getSessionState(page);
            forensicLogger.log('SESSION_CHECK_END', { cycleId: this.cycleId, accountId: id, sessionState });
            if (sessionState !== 'SESSION_ACTIVE') {
                return { status: 'FAILED', detail: 'Session EXPIRED' };
            }

            let liveOdds = null;

            if (this.isRebetContinuation) {
                logger.info(`[Cycle:${this.cycleId}] Rebet Continuation detected. Revalidating DOM natively...`);
                const restoredState = await this.adapter.revalidateRebet(page);
                liveOdds = restoredState.odds;
                forensicLogger.log('ODDS_READ_END', { cycleId: this.cycleId, accountId: id, liveOdds, rebetContinuation: true });
            } else {
                logger.info(`[Cycle:${this.cycleId}] Opening Betslip...`);
                const openCmdRaw = await this.adapter.translateOpenBetslip(page);
                await this.simulator.execute(browserObj, this._toCommand(openCmdRaw, true));
                
                await page.waitForTimeout(500);

                forensicLogger.log('ODDS_READ_START', { cycleId: this.cycleId, accountId: id });
                try {
                    liveOdds = await this.adapter.readCurrentOdds(page);
                } catch (err) {
                    logger.warn(`[Cycle:${this.cycleId}] Could not parse live odds, assuming FIXED mode or default.`);
                }
                forensicLogger.log('ODDS_READ_END', { cycleId: this.cycleId, accountId: id, liveOdds });
            }

            forensicLogger.log('BALANCE_READ_START', { cycleId: this.cycleId, accountId: id });
            const balance = await this.adapter.getBalance(page);
            forensicLogger.log('BALANCE_READ_END', { cycleId: this.cycleId, accountId: id, balance });

            this._logStateTransition('STAKE_PREPARATION', id);
            
            forensicLogger.log('POLICY_READ_START', { cycleId: this.cycleId, accountId: id });
            logger.info(`[Cycle:${this.cycleId}] Evaluating Policy Snapshot (Traceability ON)...`);
            forensicLogger.log('POLICY_READ_END', { cycleId: this.cycleId, accountId: id });

            forensicLogger.log('CONSTRAINT_CALC_START', { cycleId: this.cycleId, accountId: id });
            const decision = ConstraintEngine.evaluate(this.policy, balance, liveOdds);
            forensicLogger.log('CONSTRAINT_CALC_END', { cycleId: this.cycleId, accountId: id, decision: decision.status, calculatedStake: decision.stake });
            
            if (decision.status !== 'AUTHORIZED') {
                logger.error(`[Cycle:${this.cycleId}] Rejected execution (Status: ${decision.status}).`);
                return { status: 'FAILED', detail: `Policy Rejected: ${decision.status}` };
            }

            const stakeAmount = decision.stake;
            logger.info(`[Cycle:${this.cycleId}] Inputting Authorized Stake: ${stakeAmount}...`);
            
            const currentDOMStake = await this.adapter.readCurrentStake(page);
            const isOnConfirmScreen = await page.evaluate(() => {
                const conf = document.querySelector('.m-btn-confirm') || document.querySelector('.af-button--primary');
                return conf && conf.getBoundingClientRect().height > 0;
            }).catch(() => false);

            if (isOnConfirmScreen) {
                logger.info(`[Cycle:${this.cycleId}] Already on Confirm screen. Skipping stake typing to prevent UI corruption.`);
            } else if (currentDOMStake === stakeAmount) {
                logger.info(`[Cycle:${this.cycleId}] Stake already matches ${stakeAmount}. Skipping typing.`);
            } else {
                const stakeCmds = this.adapter.translateStake(stakeAmount);
                
                await this._captureState(page, 'B. Immediately before stake typing', id);
                forensicLogger.log('STAKE_TYPING_START', { cycleId: this.cycleId, accountId: id, expectedStake: stakeAmount });
                for (const cmdRaw of stakeCmds) {
                    await this.simulator.execute(browserObj, this._toCommand(cmdRaw, true));
                }
                forensicLogger.log('STAKE_TYPING_END', { cycleId: this.cycleId, accountId: id });
                await this._captureState(page, 'C. Immediately after stake typing', id);
            }

            this._logStateTransition('READY_TO_SUBMIT', id);
            
            // Phase 3: Immediate Pre-Flight Strict Validation (TOCTOU)
            forensicLogger.log('INTERRUPT_CHECK_START', { cycleId: this.cycleId, accountId: id });
            logger.info(`[Cycle:${this.cycleId}] Checking for Policy Interrupts (Odds banners)...`);
            const interrupt = await this.adapter.checkInterrupts(page);
            forensicLogger.log('INTERRUPT_CHECK_END', { cycleId: this.cycleId, accountId: id, interrupt: interrupt.status });
            
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

            this._logStateTransition('PROCESSING', id);
            logger.info(`[Cycle:${this.cycleId}] Submitting Bet (Atomic)...`);
            const placeCmdRaw = this.adapter.translateAtomicPlaceBet(liveOdds, stakeAmount);
            
            await this._captureState(page, 'D. Immediately before ATOMIC_PLACE_BET', id);
            forensicLogger.log('ATOMIC_PLACE_BET_START', { cycleId: this.cycleId, accountId: id, expectedOdds: liveOdds, expectedStake: stakeAmount });
            // Idempotent: false is structurally forced by the Adapter here, requiring the lease.
            try {
                await this.simulator.execute(browserObj, this._toCommand(placeCmdRaw, false));
                forensicLogger.log('ATOMIC_PLACE_BET_END', { cycleId: this.cycleId, accountId: id, result: 'SUCCESS' });
            } catch (err) {
                forensicLogger.log('ATOMIC_PLACE_BET_END', { cycleId: this.cycleId, accountId: id, result: 'FAILED', error: err.message });
                if (err.message && err.message.includes('ATOMIC-ABORT')) {
                    logger.warn(`[Cycle:${this.cycleId}] TOCTOU FAULT: ${err.message}`);
                    return { status: 'FAILED', detail: `TOCTOU Mismatch: ${err.message}` };
                }
                throw err;
            }
            await this._captureState(page, 'E. Immediately after ATOMIC_PLACE_BET', id);

            this._logStateTransition('SETTLEMENT', id);
            
            forensicLogger.log('WAIT_FOR_RESULT_START', { cycleId: this.cycleId, accountId: id });
            logger.info(`[Cycle:${this.cycleId}] Waiting for Result (Timeout: ${this.policy.Execution.Timeouts.ResultTimeoutMs}ms)...`);
            const result = await this.adapter.observeResult(page, this.policy.Execution.Timeouts.ResultTimeoutMs);
            forensicLogger.log('WAIT_FOR_RESULT_END', { cycleId: this.cycleId, accountId: id, result: result.status });

            await this._captureState(page, 'H. At BetCycle completion', id);
            if (result.status === 'SUCCESS') {
                forensicLogger.log('BETCYCLE_COMPLETE', { cycleId: this.cycleId, accountId: id, duration: Date.now() - cycleStartTime });
                return { status: 'SUCCESS', detail: 'Bet placed successfully.' };
            } else if (result.status === 'FAILED') {
                forensicLogger.log('BETCYCLE_FAILURE', { cycleId: this.cycleId, accountId: id, detail: 'Bet explicitly failed', duration: Date.now() - cycleStartTime });
                return { status: 'FAILED', detail: 'Bet explicitly failed.' };
            } else {
                forensicLogger.log('BETCYCLE_FAILURE', { cycleId: this.cycleId, accountId: id, detail: result.detail, duration: Date.now() - cycleStartTime });
                return { status: 'UNCERTAIN', detail: result.detail };
            }
        } catch (error) {
            logger.error(`[Cycle:${this.cycleId}] Unhandled cycle fault: ${error.message}`);
            forensicLogger.log('BETCYCLE_ABORT', { cycleId: this.cycleId, accountId: id, error: error.message, duration: Date.now() - cycleStartTime });
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
