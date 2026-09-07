export class SessionGuard {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Checks if the user's session is currently active.
     * It looks for either the global header balance or the betslip header balance.
     * @param {import('playwright').Page} page
     * @returns {Promise<'SESSION_ACTIVE'|'SESSION_EXPIRED'>}
     */
    async getSessionState(page) {
        try {
            // Check for the presence of either the global avatar box or the betslip asset panel in the DOM.
            // We use .count() because mobile viewports may collapse the container (0x0 dimensions), which fails isVisible().
            const globalCount = await page.locator(this.registry.sessionBalanceContainer).count().catch(() => 0);
            const betslipCount = await page.locator(this.registry.betslipBalanceContainer).count().catch(() => 0);

            if (globalCount > 0 || betslipCount > 0) {
                return 'SESSION_ACTIVE';
            }
            return 'SESSION_EXPIRED';
        } catch (error) {
            // Any catastrophic failure to read the DOM safely degrades to expired
            return 'SESSION_EXPIRED';
        }
    }

    /**
     * Retrieves and parses the current numeric balance.
     * @param {import('playwright').Page} page
     * @returns {Promise<number|null>} The balance as a float, or null if unreadable.
     */
    async getBalance(page) {
        try {
            // Evaluate in-browser to bypass Playwright's strict 0x0 visibility checks on collapsed mobile panels
            const balanceText = await page.evaluate((selectors) => {
                const betslipEl = document.querySelector(selectors.betslip);
                if (betslipEl && betslipEl.textContent && betslipEl.textContent.trim().length > 0) {
                    return betslipEl.textContent;
                }
                
                const globalEl = document.querySelector(selectors.global);
                if (globalEl && globalEl.textContent && globalEl.textContent.trim().length > 0) {
                    return globalEl.textContent;
                }
                
                return null;
            }, {
                betslip: this.registry.betslipBalanceContainer,
                global: this.registry.sessionBalanceContainer
            }).catch(() => null);

            if (!balanceText) return null;

            // Normalize the text: Strip out commas, spaces, and currency symbols (e.g., 'NGN 31.05' -> '31.05')
            const numericString = balanceText.replace(/[^0-9.]/g, '');
            const parsed = parseFloat(numericString);
            
            return isNaN(parsed) ? null : parsed;
        } catch (error) {
            return null;
        }
    }
}
