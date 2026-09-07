import { logger } from '../../config.mjs';
import { SHADOW_OBSERVER_SCRIPT } from '../adapters/sportybet/ShadowObserverScript.mjs';
import { ConstraintEngine } from '../execution/ConstraintEngine.mjs';
import { SportyBetAdapter } from '../adapters/sportybet/SportyBetAdapter.mjs';
import { Command } from '../execution/Command.mjs';
import { forensicLogger } from '../forensics/ForensicLogger.mjs';

export class PassiveShadowDaemon {
    constructor(runOrchestrator, simulator, policyManager, registry) {
        this.runOrchestrator = runOrchestrator;
        this.simulator = simulator;
        this.policyManager = policyManager;
        this.registry = registry; 
        
        this.adapter = new SportyBetAdapter();
        
        this.isActive = true;
        this.isEvaluating = false;
        this.isDirty = false;
        
        this.latestState = { isOpen: false, odds: null, stake: null };
        this.dispatchedStakes = new Map();
        this.userControlled = false; 

        // Automatically reset manual override lock when AutomationRun terminates
        if (this.runOrchestrator) {
            const origRelease = this.runOrchestrator.releaseOwnership.bind(this.runOrchestrator);
            this.runOrchestrator.releaseOwnership = (accountId, result) => {
                origRelease(accountId, result);
                if (accountId === 'master') {
                    this.resetManualOverride();
                }
            };
        }
    }

    resetManualOverride() {
        if (this.userControlled) {
            this.userControlled = false;
            logger.info({ event: 'SHADOW_MANUAL_OVERRIDE_RESET' }, `[PassiveShadowDaemon] Automation run completed. Resetting manual override lock to resume automated evaluation.`);
        }
    }

    async attachToPage(browserId, page) {
        try {
            logger.info({ event: 'SHADOW_OBSERVER_INJECTION_START', browserId, timestamp: Date.now() }, `[PassiveShadowDaemon] Starting observer injection for [${browserId}].`);
            
            await page.exposeBinding('__shadowObserverReport', async ({ source }, payload) => {
                if (browserId !== 'master') return;
                this._handleObservation(payload);
            });
            logger.info({ event: 'SHADOW_BINDING_REGISTER_SUCCESS', browserId }, `[PassiveShadowDaemon] Successfully registered __shadowObserverReport binding.`);
            
            await page.exposeBinding('__manualOverrideReport', async ({ source }) => {
                if (browserId !== 'master') return;
                if (!this.userControlled) {
                    logger.info({ event: 'SHADOW_MANUAL_OVERRIDE_DETECTED', browserId }, `[PassiveShadowDaemon] Hardware manual override detected via physical trusted event. Yielding control.`);
                    this.userControlled = true;
                }
            });

            logger.info({ event: 'SHADOW_OBSERVER_SCRIPT_INJECTION_START', browserId }, `[PassiveShadowDaemon] Injecting observer script.`);
            await page.addInitScript(SHADOW_OBSERVER_SCRIPT);
            await page.evaluate(SHADOW_OBSERVER_SCRIPT).catch(() => {});
            logger.info({ event: 'SHADOW_OBSERVER_INJECTION_SUCCESS', browserId }, `[PassiveShadowDaemon] Successfully attached to master browser [${browserId}].`);
        } catch (err) {
            if (!err.message.includes('has been already exposed')) {
                logger.info({ event: 'SHADOW_OBSERVER_INJECTION_FAILURE', browserId, error: err.message }, `[PassiveShadowDaemon] Failed to attach to ${browserId}: ${err.message}`);
            }
        }
    }

    _handleObservation(payload) {
        if (!this.isActive) return;

        this.currentObservationId = `obs-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        this.currentShadowEvaluationId = `sh-eval-${Date.now()}`;
        
        logger.info({ 
            event: 'SHADOW_OBSERVATION_RECEIVED', 
            observationId: this.currentObservationId,
            shadowEvaluationId: this.currentShadowEvaluationId,
            browserId: 'master',
            stage: 'OBSERVATION',
            status: 'SUCCESS',
            metadata: payload
        }, `[PassiveShadowDaemon] Received observation from Master.`);

        if (payload.stake !== null && this.dispatchedStakes.has('master') && payload.stake === this.dispatchedStakes.get('master')) {
             logger.info({ event: 'STAKE_UPDATE_VERIFIED', browserId: 'master', expectedStake: this.dispatchedStakes.get('master'), observedStake: payload.stake, observationId: this.currentObservationId }, `[PassiveShadowDaemon] Verified stake update via DOM mutation.`);
        }

        this.latestState = payload;
        
        if (!payload.isOpen) {
            if (this.userControlled || this.dispatchedStakes.size > 0) {
                logger.info({ event: 'SHADOW_EVALUATION_SKIPPED', shadowEvaluationId: this.currentShadowEvaluationId, reason: 'Betslip closed. Resetting.' }, `[PassiveShadowDaemon] Betslip closed. Resetting shadow state.`);
            }
            this.userControlled = false;
            this.dispatchedStakes.clear();
            return;
        }

        this.isDirty = true;
        this._evaluateLoop();
    }

    async _evaluateLoop() {
        if (this.isEvaluating) return;
        this.isEvaluating = true;

        try {
            while (this.isDirty) {
                this.isDirty = false;
                const obsId = this.currentObservationId;
                const evalId = this.currentShadowEvaluationId;

                if (this.userControlled) {
                    logger.info({ event: 'SHADOW_EVALUATION_SKIPPED', shadowEvaluationId: evalId, reason: 'userControlled is true.' }, `[PassiveShadowDaemon] Stopping evaluation loop: User override active.`);
                    break;
                }

                const { isOpen, odds, stake } = this.latestState;
                if (!isOpen || odds === null || isNaN(odds)) {
                    logger.info({ event: 'SHADOW_EVALUATION_SKIPPED', shadowEvaluationId: evalId, reason: 'Invalid state or odds.' }, `[PassiveShadowDaemon] Skipping evaluation: Invalid state or odds.`);
                    continue;
                }

                logger.info({ event: 'SHADOW_EVALUATION_START', shadowEvaluationId: evalId, observationId: obsId, odds, currentStake: stake }, `[PassiveShadowDaemon] Starting evaluation loop.`);

                const master = this.registry.getMaster();
                const slaves = this.registry.getReadySlaves();
                const browsers = [];
                if (master) browsers.push(master);
                browsers.push(...slaves);

                if (browsers.length === 0) {
                     logger.info({ event: 'SHADOW_EVALUATION_SKIPPED', shadowEvaluationId: evalId, reason: 'No browsers available.' }, `[PassiveShadowDaemon] No browsers available.`);
                     continue;
                }
                
                logger.info({ event: 'SHADOW_TARGET_BROWSERS_RESOLVED', count: browsers.length, browserIds: browsers.map(b => b.id) }, `[PassiveShadowDaemon] Resolved target browsers.`);
                logger.info({ event: 'SHADOW_ODDS_RESOLVED', source: 'master', odds, shadowEvaluationId: evalId, observationId: obsId }, `[PassiveShadowDaemon] Odds resolved for evaluation.`);

                if (!this.isTyping) this.isTyping = new Set();
                
                browsers.forEach((browserObj) => {
                    const bId = browserObj.id;
                    if (this.isTyping.has(bId)) {
                         return; // Prevents overlapping typing tasks on the same browser
                    }
                    this.isTyping.add(bId);

                    (async () => {
                        try {
                            const prepId = evalId;
                            forensicLogger.log('PREPARATION_START', { preparationId: prepId, accountId: bId, browserId: bId });
                            logger.info({ event: 'SHADOW_ACCOUNT_EVALUATION_START', browserId: bId, shadowEvaluationId: evalId }, `[PassiveShadowDaemon] Starting evaluation for browser [${bId}]`);
                            
                            if (this.userControlled) return;
                            
                            forensicLogger.log('PASSIVE_EXECUTION_CHECK', { accountId: bId, browserId: bId, preparationId: prepId, isExecuting: this.runOrchestrator.isExecuting(bId) });
                            if (this.runOrchestrator.isExecuting(bId)) {
                                forensicLogger.log('PASSIVE_EXECUTION_ABORT', { reason: 'RunOrchestrator lock active', ownershipId: bId, cycleId: null });
                                logger.info({ event: 'SHADOW_EVALUATION_SKIPPED', browserId: bId, shadowEvaluationId: evalId, reason: 'RunOrchestrator lock active' }, `[PassiveShadowDaemon] Suspending evaluation for [${bId}]: RunOrchestrator is EXECUTING.`);
                                return;
                            }

                            forensicLogger.log('ODDS_OBSERVED', { preparationId: prepId, accountId: bId, odds });
                            logger.info({ event: 'SHADOW_POLICY_RESOLUTION_START', browserId: bId, shadowEvaluationId: evalId }, `[PassiveShadowDaemon] Resolving policy.`);
                            const policy = this.policyManager.getPolicy(bId);
                            if (!policy || !browserObj.page) {
                                logger.info({ event: 'SHADOW_POLICY_RESOLUTION_FAILURE', browserId: bId, shadowEvaluationId: evalId, reason: 'Missing policy or page object.' }, `[PassiveShadowDaemon] Missing policy or page object.`);
                                return;
                            }
                            logger.info({ event: 'SHADOW_POLICY_RESOLUTION_SUCCESS', browserId: bId, shadowEvaluationId: evalId, policyMode: policy.Pricing?.Strategy?.Mode }, `[PassiveShadowDaemon] Policy resolution successful.`);

                            let balance;
                            logger.info({ event: 'SHADOW_BALANCE_RESOLUTION_START', browserId: bId, shadowEvaluationId: evalId }, `[PassiveShadowDaemon] Resolving balance.`);
                            try {
                                balance = await this.adapter.getBalance(browserObj.page);
                                forensicLogger.log('BALANCE_OBSERVED', { preparationId: prepId, accountId: bId, balance });
                                logger.info({ event: 'SHADOW_BALANCE_RESOLUTION_SUCCESS', browserId: bId, shadowEvaluationId: evalId, balance }, `[PassiveShadowDaemon] Balance resolution successful.`);
                            } catch (err) {
                                logger.info({ event: 'SHADOW_BALANCE_RESOLUTION_FAILURE', browserId: bId, shadowEvaluationId: evalId, error: err.message }, `[PassiveShadowDaemon] Failed to read live balance for [${bId}]: ${err.message}`);
                                return;
                            }

                            logger.info({ event: 'SHADOW_CALCULATION_START', browserId: bId, shadowEvaluationId: evalId }, `[PassiveShadowDaemon] Evaluating ConstraintEngine.`);
                            const decision = ConstraintEngine.evaluate(policy, balance, odds);
                            forensicLogger.log('STAKE_CALCULATED', { preparationId: prepId, accountId: bId, calculatedStake: decision.stake });
                            logger.info({ event: 'SHADOW_CALCULATION_SUCCESS', browserId: bId, shadowEvaluationId: evalId, inputs: { balance, odds }, output: { status: decision.status, stake: decision.stake }, trace: decision.trace }, `[PassiveShadowDaemon] ConstraintEngine evaluation complete.`);

                            const lastDispatched = this.dispatchedStakes.get(bId) || null;

                            if (bId === 'master' && decision.stake === stake) {
                                if (decision.stake !== lastDispatched) {
                                    this.dispatchedStakes.set(bId, decision.stake);
                                }
                                logger.info({ event: 'STAKE_UNCHANGED', browserId: bId, shadowEvaluationId: evalId, calculatedStake: decision.stake, observedStake: stake, reason: 'Master DOM already reflects intended stake.' }, `[PassiveShadowDaemon] Stake unchanged on Master.`);
                                return;
                            }

                            if (decision.status === 'AUTHORIZED') {
                                if (decision.stake === lastDispatched) {
                                    logger.info({ event: 'STAKE_UPDATE_SKIPPED', browserId: bId, shadowEvaluationId: evalId, calculatedStake: decision.stake, previousStake: lastDispatched, reason: 'Stake matches last dispatched value.' }, `[PassiveShadowDaemon] Stake update skipped.`);
                                    return;
                                }
                                
                                logger.info({ event: 'STAKE_CHANGE_REQUIRED', browserId: bId, shadowEvaluationId: evalId, previousStake: lastDispatched, calculatedStake: decision.stake, observedStake: stake }, `[PassiveShadowDaemon] Calculated new target stake for [${bId}]: ${decision.stake} (Odds: ${odds}). Dispatching.`);
                                
                                logger.info({ event: 'SHADOW_STAKE_COMMAND_CREATION_START', browserId: bId, shadowEvaluationId: evalId }, `[PassiveShadowDaemon] Generating raw keystroke commands.`);
                                const rawCommands = this.adapter.translateStake(decision.stake);
                                logger.info({ event: 'SHADOW_STAKE_COMMAND_CREATED', browserId: bId, shadowEvaluationId: evalId, count: rawCommands.length }, `[PassiveShadowDaemon] Generated execution commands.`);
                                forensicLogger.log('STAKE_TYPING_START', { preparationId: prepId, accountId: bId, expectedStake: decision.stake, commandCount: rawCommands.length });
                                
                                try {
                                    let keyIndex = 0;
                                    for (const rawCmd of rawCommands) {
                                        forensicLogger.log('PASSIVE_EXECUTION_CHECK', { accountId: bId, browserId: bId, preparationId: prepId, isExecuting: this.runOrchestrator.isExecuting(bId) });
                                        if (this.runOrchestrator.isExecuting(bId)) {
                                            forensicLogger.log('PASSIVE_EXECUTION_ABORT', { reason: 'RunOrchestrator lock acquired mid-flight', ownershipId: bId, expectedStakeValue: decision.stake, currentCommandIndex: keyIndex, remainingCommands: rawCommands.length - keyIndex });
                                            logger.info({ event: 'SHADOW_ACTION_EXECUTION_REJECTED', browserId: bId, shadowEvaluationId: evalId, reason: 'RunOrchestrator lock acquired mid-flight' }, `[PassiveShadowDaemon] Aborting typing sequence mid-flight for [${bId}].`);
                                            return;
                                        }
                                        if (this.userControlled) {
                                            forensicLogger.log('PASSIVE_EXECUTION_ABORT', { reason: 'Hardware override detected mid-flight', ownershipId: bId, expectedStakeValue: decision.stake, currentCommandIndex: keyIndex, remainingCommands: rawCommands.length - keyIndex });
                                            logger.info({ event: 'SHADOW_ACTION_EXECUTION_REJECTED', browserId: bId, shadowEvaluationId: evalId, reason: 'Hardware override detected mid-flight' }, `[PassiveShadowDaemon] Aborting typing sequence mid-flight.`);
                                            return;
                                        }
                                        
                                        const command = new Command({
                                            category: 'Execution',
                                            type: rawCmd.type,
                                            payload: rawCmd.payload,
                                            source: 'PASSIVE_SHADOW',
                                            idempotent: true,
                                            metadata: { shadowEvaluationId: evalId, observationId: obsId }
                                        });
                                        
                                        forensicLogger.log('STAKE_KEY_START', { preparationId: prepId, accountId: bId, keyIndex, key: rawCmd.payload?.key || rawCmd.type, expectedStake: decision.stake, commandId: command.id });
                                        logger.info({ event: 'STAKE_COMMAND_DISPATCHED', browserId: bId, commandId: command.id, shadowEvaluationId: evalId, commandType: command.type }, `[PassiveShadowDaemon] Dispatching command to ActionSimulator.`);
                                        await this.simulator.execute(browserObj, command);
                                        forensicLogger.log('STAKE_KEY_COMPLETE', { preparationId: prepId, accountId: bId, keyIndex, key: rawCmd.payload?.key || rawCmd.type, commandId: command.id });
                                        keyIndex++;
                                    }
                                    forensicLogger.log('STAKE_TYPING_COMPLETE', { preparationId: prepId, accountId: bId });
                                    forensicLogger.log('PREPARATION_COMPLETE', { preparationId: prepId, accountId: bId });
                                    logger.info({ event: 'STAKE_UPDATE_DISPATCHED', browserId: bId, shadowEvaluationId: evalId, expectedStake: decision.stake }, `[PassiveShadowDaemon] All stake keystroke commands dispatched successfully.`);
                                } catch (cmdErr) {
                                    logger.info({ event: 'SHADOW_ACTION_EXECUTION_FAILURE', browserId: bId, shadowEvaluationId: evalId, error: cmdErr.message }, `[PassiveShadowDaemon] Failed to dispatch target stake for [${bId}]: ${cmdErr.message}`);
                                    this.dispatchedStakes.delete(bId);
                                    return;
                                }
                                
                                this.dispatchedStakes.set(bId, decision.stake);
                            } else {
                                 logger.info({ event: 'STAKE_UPDATE_SKIPPED', browserId: bId, shadowEvaluationId: evalId, calculatedStake: decision.stake, status: decision.status, reason: 'Calculation status is NOT AUTHORIZED.' }, `[PassiveShadowDaemon] Stake calculation unauthorized.`);
                            }
                        } finally {
                            this.isTyping.delete(bId);
                        }
                    })();
                });

                await new Promise(r => setTimeout(r, 200));
            }
        } catch (error) {
            logger.info({ event: 'SHADOW_EVALUATION_FAILURE', error: error.message, stack: error.stack }, `[PassiveShadowDaemon] Evaluation loop failed: ${error.message}`);
        } finally {
            this.isEvaluating = false;
        }
    }

    stop() {
        this.isActive = false;
        logger.info(`[PassiveShadowDaemon] Stopped.`);
    }
}
