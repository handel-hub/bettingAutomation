import { logger } from '../../config.mjs';
import { SHADOW_OBSERVER_SCRIPT } from '../adapters/sportybet/ShadowObserverScript.mjs';
import { ConstraintEngine } from '../execution/ConstraintEngine.mjs';
import { SportyBetAdapter } from '../adapters/sportybet/SportyBetAdapter.mjs';
import { Command } from '../execution/Command.mjs';

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
    }

    /**
     * Injects the observer bindings and scripts into a Playwright page.
     */
    async attachToPage(browserId, page) {
        try {
            await page.exposeBinding('__shadowObserverReport', async ({ source }, payload) => {
                if (browserId !== 'master') return; // We only shadow on the master
                this._handleObservation(payload);
            });
            
            // Definitively catch hardware-level physical interventions
            await page.exposeBinding('__manualOverrideReport', async ({ source }) => {
                if (browserId !== 'master') return;
                if (!this.userControlled) {
                    logger.info(`[PassiveShadowDaemon] Hardware manual override detected via physical trusted event. Yielding control.`);
                    this.userControlled = true;
                }
            });

            await page.addInitScript(SHADOW_OBSERVER_SCRIPT);
            await page.evaluate(SHADOW_OBSERVER_SCRIPT).catch(() => {});
            logger.info(`[PassiveShadowDaemon] Successfully attached to master browser [${browserId}].`);
        } catch (err) {
            if (!err.message.includes('has been already exposed')) {
                logger.warn(`[PassiveShadowDaemon] Failed to attach to ${browserId}: ${err.message}`);
            }
        }
    }

    _handleObservation(payload) {
        if (!this.isActive) return;

        this.latestState = payload;
        
        // 1. If Betslip is closed, reset everything.
        if (!payload.isOpen) {
            if (this.userControlled || this.dispatchedStakes.size > 0) {
                logger.info(`[PassiveShadowDaemon] Betslip closed. Resetting shadow state.`);
            }
            this.userControlled = false;
            this.dispatchedStakes.clear();
            return;
        }

        // 3. Trigger evaluation loop
        this.isDirty = true;
        this._evaluateLoop();
    }

    async _evaluateLoop() {
        if (this.isEvaluating) return;
        this.isEvaluating = true;

        try {
            while (this.isDirty) {
                this.isDirty = false;

                // Stop evaluation if yielding to user override
                if (this.userControlled) break;

                const { isOpen, odds, stake } = this.latestState;
                if (!isOpen || odds === null || isNaN(odds)) continue;

                const master = this.registry.getMaster();
                const slaves = this.registry.getReadySlaves();
                const browsers = [];
                if (master) browsers.push(master);
                browsers.push(...slaves);

                if (browsers.length === 0) continue;

                await Promise.all(browsers.map(async (browserObj) => {
                    if (this.userControlled) return;
                    if (this.runOrchestrator.isExecuting(browserObj.id)) {
                        logger.debug(`[PassiveShadowDaemon] Suspending evaluation for [${browserObj.id}]: RunOrchestrator is EXECUTING.`);
                        return;
                    }

                    const policy = this.policyManager.getPolicy(browserObj.id);
                    if (!policy || !browserObj.page) return;

                    let balance;
                    try {
                        balance = await this.adapter.getBalance(browserObj.page);
                    } catch (err) {
                        logger.warn(`[PassiveShadowDaemon] Failed to read live balance for [${browserObj.id}]: ${err.message}`);
                        return;
                    }

                    const decision = ConstraintEngine.evaluate(policy, balance, odds);

                    const lastDispatched = this.dispatchedStakes.get(browserObj.id) || null;

                    // If it's the master and the DOM already reflects the calculated stake, just track it and skip typing.
                    if (browserObj.id === 'master' && decision.stake === stake) {
                        if (decision.stake !== lastDispatched) {
                            this.dispatchedStakes.set(browserObj.id, decision.stake);
                        }
                        return;
                    }

                    if (decision.status === 'AUTHORIZED' && decision.stake !== lastDispatched) {
                        logger.info(`[PassiveShadowDaemon] Calculated new target stake for [${browserObj.id}]: ${decision.stake} (Odds: ${odds}). Dispatching.`);
                        
                        const rawCommands = this.adapter.translateStake(decision.stake);
                        
                        try {
                            for (const rawCmd of rawCommands) {
                                if (this.runOrchestrator.isExecuting(browserObj.id)) {
                                    logger.info(`[PassiveShadowDaemon] Aborting typing sequence mid-flight for [${browserObj.id}]: RunOrchestrator lock acquired.`);
                                    return;
                                }
                                if (this.userControlled) {
                                    logger.info(`[PassiveShadowDaemon] Aborting typing sequence mid-flight: Hardware manual override detected.`);
                                    return;
                                }
                                
                                const command = new Command({
                                    category: 'Execution',
                                    type: rawCmd.type,
                                    payload: rawCmd.payload,
                                    source: 'PASSIVE_SHADOW',
                                    idempotent: true
                                });
                                await this.simulator.execute(browserObj, command);
                            }
                        } catch (cmdErr) {
                            logger.warn(`[PassiveShadowDaemon] Failed to dispatch target stake for [${browserObj.id}]: ${cmdErr.message}`);
                            this.dispatchedStakes.delete(browserObj.id);
                            return;
                        }
                        
                        this.dispatchedStakes.set(browserObj.id, decision.stake);
                    }
                }));

                // Allow DOM/Vue reactivity to settle before the next iteration
                await new Promise(r => setTimeout(r, 200));
            }
        } catch (error) {
            logger.error(`[PassiveShadowDaemon] Evaluation loop failed: ${error.message}`);
        } finally {
            this.isEvaluating = false;
        }
    }

    stop() {
        this.isActive = false;
        logger.info(`[PassiveShadowDaemon] Stopped.`);
    }
}
