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
            // Check for the presence of either the global avatar box or the betslip asset panel
            const isGlobalVisible = await page.locator(this.registry.sessionBalanceContainer).isVisible().catch(() => false);
            const isBetslipVisible = await page.locator(this.registry.betslipBalanceContainer).isVisible().catch(() => false);

            if (isGlobalVisible || isBetslipVisible) {
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
            let balanceText = null;
            
            // Prefer betslip panel if we are actively inside the betslip, otherwise fallback to global navbar
            const betslipPanel = page.locator(this.registry.betslipBalanceContainer);
            if (await betslipPanel.isVisible().catch(() => false)) {
                balanceText = await betslipPanel.innerText();
            } else {
                // The global balance is in a specific span inside .avatar-box to avoid grabbing the currency code
                const globalPanel = page.locator(`${this.registry.sessionBalanceContainer} span:not(.currency)`).first();
                if (await globalPanel.isVisible().catch(() => false)) {
                    balanceText = await globalPanel.innerText();
                }
            }

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
