export class RebetController {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Translates the Rebet intent into a generic CLICK command.
     * @returns {Object} Command payload
     */
    translateRebet() {
        return {
            type: 'CLICK',
            payload: { 
                selector: this.registry.rebetTrigger, 
                idempotent: true,
                locatorTimeout: 5000 
            }
        };
    }

    /**
     * Translates the intent to dismiss the success modal into a generic CLICK command.
     * @returns {Object} Command payload
     */
    translateDismissSuccess() {
        return {
            type: 'CLICK',
            payload: { 
                selector: this.registry.successOkButton, 
                idempotent: true,
                locatorTimeout: 5000 
            }
        };
    }

    /**
     * After a Rebet action is executed, the DOM restores the betslip.
     * This explicitly waits for the DOM to settle, then extracts the restored
     * stake and odds so the Generic Engine can enforce its policy checks,
     * guaranteeing we never blindly trust stale data.
     * 
     * @param {import('playwright').Page} page
     * @returns {Promise<{stake: number, odds: number}>}
     */
    async revalidateRebet(page) {
        try {
            // 1. Wait for the success modal to be destroyed/hidden after clicking Rebet
            await page.waitForSelector('.success-wrap, .dialog-container.fast-betslip-success', { state: 'hidden', timeout: 5000 }).catch(() => {});
            
            // 2. Ensure the main betslip is visible
            await page.waitForSelector(this.registry.fastBetslipWrap, { state: 'visible', timeout: 5000 });

            // 3. Extract the pre-filled stake (using inputValue for inputs, innerText for spans)
            const stakeElement = page.locator(this.registry.stakeInput).first();
            const tagName = await stakeElement.evaluate(el => el.tagName.toLowerCase()).catch(() => 'span');
            const stakeText = tagName === 'input' ? await stakeElement.inputValue() : await stakeElement.innerText();
            const stake = parseFloat(stakeText.replace(/[^0-9.]/g, ''));

            // 4. Extract the active odds from the first selection in the list
            const oddsElement = page.locator(this.registry.outcomeOdds).first();
            const oddsText = await oddsElement.innerText();
            const odds = parseFloat(oddsText.replace(/[^0-9.]/g, ''));

            return {
                stake: isNaN(stake) ? 0 : stake,
                odds: isNaN(odds) ? 0 : odds
            };
        } catch (error) {
            // If the rebet fails to restore the slip properly, we return 0 for safe fallback,
            // forcing the Generic Engine to recognize a policy violation or invalid state.
            return { stake: 0, odds: 0 };
        }
    }
}
