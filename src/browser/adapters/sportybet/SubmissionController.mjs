export class SubmissionController {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Identifies the active trigger for the betslip based on current UI state,
     * and returns a generic CLICK command to open it.
     * @param {import('playwright').Page} page
     * @returns {Promise<Object>} Command payload
     */
    async translateOpenBetslip(page) {
        // First check if it's already open by seeing if the wrapper is expanded
        const isOpen = await page.evaluate((selector) => {
            const wrap = document.querySelector(selector);
            return wrap && wrap.getBoundingClientRect().height > 0;
        }, this.registry.fastBetslipWrap).catch(() => false);

        if (isOpen) {
            return {
                type: 'NOOP',
                payload: { reason: 'Betslip already open' }
            };
        }

        const triggers = [
            this.registry.fastBetslipTrigger,
            this.registry.bottomNavBetslipTrigger,
            this.registry.themeIconTrigger
        ];

        for (const selector of triggers) {
            const isVisible = await page.locator(selector).isVisible().catch(() => false);
            if (isVisible) {
                return {
                    type: 'CLICK',
                    payload: { selector: selector, idempotent: true }
                };
            }
        }

        throw new Error('No valid betslip trigger is currently visible in the DOM. Ensure a selection has been made.');
    }

    /**
     * Translates the Place Bet intent into a strictly non-idempotent generic CLICK.
     * @returns {Object} Command payload
     */
    translatePlaceBet() {
        return {
            type: 'CLICK',
            payload: { 
                selector: this.registry.placeBetButton, 
                // CRITICAL: IDEMPOTENT = FALSE. Never auto-retry a financial transaction on timeout.
                idempotent: false 
            }
        };
    }

    /**
     * Translates the Place Bet intent into an ATOMIC_PLACE_BET command that performs
     * TOCTOU validation natively inside the browser event loop before clicking.
     * @param {number} expectedOdds
     * @returns {Object} Command payload
     */
    translateAtomicPlaceBet(expectedOdds) {
        return {
            type: 'ATOMIC_PLACE_BET',
            payload: {
                oddsSelector: this.registry.outcomeOdds,
                selector: this.registry.placeBetButton,
                confirmSelector: this.registry.flexibetConfirmButton,
                expectedOdds: expectedOdds,
                idempotent: false
            }
        };
    }

    /**
     * Returns a generic CLICK command to accept an odds change notification.
     * @returns {Object} Command payload
     */
    translateAcceptOdds() {
        return {
            type: 'CLICK',
            payload: { 
                selector: this.registry.acceptOddsButton, 
                idempotent: true 
            }
        };
    }
}
