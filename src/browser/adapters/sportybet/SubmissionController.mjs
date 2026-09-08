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
     * @param {number} expectedStake
     * @returns {Object} Command payload
     */
    translateAtomicPlaceBet(expectedOdds, expectedStake) {
        return {
            type: 'ATOMIC_PLACE_BET',
            payload: {
                // Playwright targets the body (Always exists, never times out, no strict mode violation)
                selector: 'body', 
                
                // Pass the button selectors as data for the native script
                placeBetSelector: this.registry.placeBetButton,
                confirmSelector: this.registry.flexibetConfirmButton,
                oddsSelector: this.registry.outcomeOdds,
                stakeSelector: this.registry.stakeInput,
                confirmStakeSelector: this.registry.confirmStakeText,
                
                expectedOdds,
                expectedStake,
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

    /**
     * Translates the Cashout intent into an ATOMIC_CASHOUT command.
     * @param {string|null} betId
     * @param {string|null} targetSelector
     * @returns {Object} Command payload
     */
    translateAtomicCashout(betId = null, targetSelector = null) {
        return {
            type: 'ATOMIC_CASHOUT',
            payload: {
                selector: 'body',
                betId,
                targetSelector,
                cashoutSelector: this.registry.cashoutButton,
                confirmSelector: this.registry.cashoutConfirmButton,
                modalSelector: this.registry.cashoutConfirmModal,
                successToastSelector: this.registry.cashoutSuccessToast,
                errorToastSelector: this.registry.cashoutErrorToast,
                confirmTimeoutMs: 5000,
                resultTimeoutMs: 12000,
                idempotent: false
            }
        };
    }
}
