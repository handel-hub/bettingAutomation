import { logger } from '../../config.mjs';
import { Workflow } from './Workflow.mjs';
import { raceWithCleanup } from '../../utils/playwright.mjs';

export class CashoutWorkflow extends Workflow {
    async execute(browserObj, payload = {}, lockManager, registry) {
        const { id, page, username } = browserObj;
        const accountUsername = username;

        if (!accountUsername) {
            throw new Error(`CashoutWorkflow requires a valid username, but none was provided for slave [${id}]`);
        }

        logger.info(`Starting Cashout Workflow on ${accountUsername} [${id}]`);

        if (lockManager) lockManager.acquireLock(accountUsername);

        try {
            // 1. Navigate to Open Bets
            const openBetsBtn = page.locator(this.selectors.openBetsNav).first();
            if (await openBetsBtn.isVisible()) {
                await openBetsBtn.click();
            }

            // Wait for dynamic content loading mask to disappear
            if (this.selectors.loadingMask) {
                await page.locator(this.selectors.loadingMask).waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
            }

            // 2. Find all cashable tickets
            const tickets = page.locator(`${this.selectors.ticket}:has(${this.selectors.cashoutBtn})`);
            const count = await tickets.count();
            
            if (count === 0) {
                logger.info(`No cashable tickets found for ${accountUsername} [${id}]`);
                return true;
            }

            logger.info(`Found ${count} cashable tickets for ${accountUsername}. Proceeding...`);

            // 3. Process each ticket
            let processedCount = 0;
            const MAX_ITERATIONS = 50;

            while (processedCount < count && processedCount < MAX_ITERATIONS) {
                if (lockManager) lockManager.refreshLock(accountUsername);

                // Re-select first available cashout button each loop due to DOM mutations
                const ticket = page.locator(`${this.selectors.ticket}:has(${this.selectors.cashoutBtn})`).first();
                const exists = await ticket.count();
                if (exists === 0) break;
                
                processedCount++;
                const cashoutBtn = ticket.locator(this.selectors.cashoutBtn);
                
                if (await cashoutBtn.isVisible()) {
                    await cashoutBtn.click();
                    
                    // 4. Wait for and click confirmation (in-place text change)
                    try {
                        const confirmBtn = ticket.locator(this.selectors.confirmBtn);
                        await confirmBtn.waitFor({ state: 'visible', timeout: 3000 });
                        await confirmBtn.click();
                    } catch (err) {
                        logger.warn(`Confirm button did not appear for ${accountUsername} [${id}]`);
                        continue;
                    }

                    // 5. Verify outcome
                    try {
                        const result = await raceWithCleanup(page,
                            async () => await page.$(this.selectors.toastSuccess),
                            async () => {
                                const el = await page.$(this.selectors.toastError);
                                if (el) return await el.textContent();
                                return null;
                            },
                            10000
                        );
                        
                        if (result.outcome === 'error') {
                            throw new Error(result.message.trim());
                        }
                        logger.info(`Cashout successful on ticket for ${accountUsername} [${id}]`);
                    } catch (err) {
                        logger.warn(`Cashout rejected/failed for ${accountUsername} [${id}]: ${err.message}`);
                    }
                }
            }
            return true;
        } catch (err) {
            logger.error(`Cashout workflow failed on ${accountUsername} [${id}]: ${err.message}`);
            return false;
        } finally {
            if (lockManager) lockManager.releaseLock(accountUsername);

            // Resynchronization
            if (registry) {
                try {
                    await page.goBack().catch(() => {});
                    await page.waitForTimeout(500);

                    const master = registry.getMaster();
                    if (master && master.url && page.url() !== master.url) {
                        logger.info(`Slave [${id}] out of sync. Teleporting to Master URL.`);
                        await page.goto(master.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
                    }
                } catch (syncErr) {
                    logger.error(`Slave [${id}] failed to resync: ${syncErr.message}`);
                }
            }
        }
    }
}
