import { logger } from '../../utils/logger.mjs';
import { CashoutCycle } from './CashoutCycle.mjs';
import crypto from 'node:crypto';

/**
 * CashoutTransaction
 * Coordinates the cashout intent for a specific account.
 * Controls retries before the boundary and halts on UNCERTAIN.
 */
export class CashoutTransaction {
    constructor(runId, accountId, simulator, runOrchestrator, payload = {}) {
        this.runId = runId;
        this.accountId = accountId;
        this.simulator = simulator;
        this.runOrchestrator = runOrchestrator;
        this.betId = payload.betId || null;
        this.targetSelector = payload.selector || null;
        
        this.state = 'CREATED';
        this.cycleCount = 0;
        this.activeCycle = null;
        this.createdAt = Date.now();
    }

    async start(browserObj) {
        this.state = 'ACTIVE';
        logger.info(`[CashoutTransaction:${this.runId}] Starting cashout transaction on [${this.accountId}].`);

        // Ensure browser is situated on the Open Bets view
        if (browserObj?.page) {
            try {
                const currentUrl = browserObj.page.url() || '';
                if (!currentUrl.includes('/my_accounts/open_bets')) {
                    logger.info(`[CashoutTransaction:${this.runId}] Browser [${this.accountId}] not on Open Bets. Navigating...`);
                    await browserObj.page.goto('https://www.sportybet.com/ng/m/my_accounts/open_bets?from=nav_bar', { waitUntil: 'domcontentloaded', timeout: 10000 });
                    await browserObj.page.waitForTimeout(1000);
                }
            } catch (navErr) {
                logger.warn(`[CashoutTransaction:${this.runId}] Navigation pre-flight warning for [${this.accountId}]: ${navErr.message}`);
            }
        }

        let active = true;
        const maxPreBoundaryRetries = 2;
        let attempt = 0;

        try {
            while (active) {
                attempt++;
                this.cycleCount++;
                const cycleId = crypto.randomUUID();

                this.activeCycle = new CashoutCycle({
                    runId: this.runId,
                    cycleId,
                    betId: this.betId,
                    targetSelector: this.targetSelector,
                    simulator: this.simulator,
                    runOrchestrator: this.runOrchestrator
                });

                const result = await this.activeCycle.execute(browserObj);
                logger.info(`[CashoutTransaction:${this.runId}] Cycle [${cycleId}] finished with status: ${result.status}`);

                if (result.status === 'SUCCESS') {
                    this.state = 'COMPLETED';
                    active = false;
                } else if (result.status === 'UNCERTAIN') {
                    logger.warn(`[CashoutTransaction:${this.runId}] Cycle returned UNCERTAIN. Freezing transaction.`);
                    this.state = 'UNCERTAIN';
                    active = false;
                } else if (result.status === 'ABORTED') {
                    // Pre-boundary abort (e.g. modal didn't open). Can retry if under limit
                    if (attempt < maxPreBoundaryRetries && !result.detail?.includes('disabled')) {
                        logger.info(`[CashoutTransaction:${this.runId}] Pre-boundary abort. Retrying attempt ${attempt + 1}...`);
                        await new Promise(r => setTimeout(r, 500));
                    } else {
                        logger.info(`[CashoutTransaction:${this.runId}] Pre-boundary abort. Retries exhausted or bet disabled. Terminating.`);
                        this.state = 'ABORTED';
                        active = false;
                    }
                } else {
                    // FAILED
                    this.state = 'FAILED';
                    active = false;
                }
            }
        } catch (err) {
            logger.error(`[CashoutTransaction:${this.runId}] Fatal error: ${err.message}`);
            this.state = 'FAILED';
        }

        return {
            status: this.state,
            cycles: this.cycleCount
        };
    }
}
