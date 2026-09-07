export class BetslipObserver {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Checks if the betslip overlay is actively open and visible.
     * @param {import('playwright').Page} page
     * @returns {Promise<boolean>}
     */
    async isBetslipOpen(page) {
        return await page.locator(this.registry.fastBetslipWrap).isVisible().catch(() => false);
    }

    /**
     * Checks the betslip notification area for odds changes or market suspensions.
     * @param {import('playwright').Page} page
     * @returns {Promise<{status: 'CLEAR'|'INTERRUPT_REQUIRED', reason?: string, detail?: string}>}
     */
    async checkInterrupts(page) {
        try {
            const notification = page.locator(this.registry.betslipNotification);
            
            // Only parse if the notification container actually exists and is visible
            if (await notification.isVisible().catch(() => false)) {
                const text = await notification.innerText();
                
                // SportyBet injects text here when prices shift or markets suspend
                if (text && text.trim().length > 0) {
                    return { 
                        status: 'INTERRUPT_REQUIRED', 
                        reason: 'PRICE', 
                        detail: text.trim() 
                    };
                }
            }
            
            return { status: 'CLEAR' };
        } catch (error) {
            // Failsafe: If DOM inspection crashes, assume clear and let the submit button
            // validation or ResultResolver catch the actual blocker.
            return { status: 'CLEAR' };
        }
    }
}
