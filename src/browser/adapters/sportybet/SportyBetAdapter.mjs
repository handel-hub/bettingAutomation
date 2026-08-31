import { SportyBetLocatorRegistry } from './SportyBetLocatorRegistry.mjs';
import { SessionGuard } from './SessionGuard.mjs';
import { KeyboardController } from './KeyboardController.mjs';
import { SubmissionController } from './SubmissionController.mjs';
import { BetslipObserver } from './BetslipObserver.mjs';
import { ResultResolver } from './ResultResolver.mjs';
import { RebetController } from './RebetController.mjs';

export class SportyBetAdapter {
    constructor() {
        this.locators = new SportyBetLocatorRegistry();
        this.sessionGuard = new SessionGuard(this.locators);
        this.keyboardController = new KeyboardController(this.locators);
        this.submissionController = new SubmissionController(this.locators);
        this.betslipObserver = new BetslipObserver(this.locators);
        this.resultResolver = new ResultResolver(this.locators);
        this.rebetController = new RebetController(this.locators);
    }

    /**
     * Translates the Rebet intent into a generic CLICK command.
     * @returns {Object} Command payload
     */
    translateRebet() {
        return this.rebetController.translateRebet();
    }

    /**
     * Explicitly re-extracts the restored stake and odds after a Rebet.
     * @param {import('playwright').Page} page
     * @returns {Promise<{stake: number, odds: number}>}
     */
    async revalidateRebet(page) {
        return this.rebetController.revalidateRebet(page);
    }

    /**
     * Performs a highly strict, immediate read of the live odds.
     * Used for TOCTOU (Time-Of-Check to Time-Of-Use) validation just prior to submission.
     * @param {import('playwright').Page} page
     * @returns {Promise<number|null>} The parsed odds, or null if unreadable
     */
    async readCurrentOdds(page) {
        try {
            // Use textContent instead of innerText to bypass layout calculations (crucial for TOCTOU speed) and visibility quirks
            const oddsText = await page.locator(this.locators.outcomeOdds).textContent({ timeout: 100 });
            const parsed = parseFloat(oddsText);
            if (!isNaN(parsed)) return parsed;
        } catch (err) {
            // Do not log extensively on timeout, as this is a fast path
        }
        return null;
    }

    /**
     * Observes the DOM for definitive Primary Evidence of the bet result.
     * @param {import('playwright').Page} page
     * @param {number} timeoutMs
     * @returns {Promise<{status: 'SUCCESS'|'FAILED'|'UNCERTAIN', detail?: string}>}
     */
    async observeResult(page, timeoutMs = 30000) {
        return this.resultResolver.observeResult(page, timeoutMs);
    }

    /**
     * Checks if the user's session is currently active.
     * @param {import('playwright').Page} page
     * @returns {Promise<'SESSION_ACTIVE'|'SESSION_EXPIRED'>}
     */
    async getSessionState(page) {
        return this.sessionGuard.getSessionState(page);
    }

    /**
     * Retrieves the current numeric balance from the DOM.
     * @param {import('playwright').Page} page
     * @returns {Promise<number|null>}
     */
    async getBalance(page) {
        return this.sessionGuard.getBalance(page);
    }

    /**
     * Checks if the betslip overlay is actively open and visible.
     * @param {import('playwright').Page} page
     * @returns {Promise<boolean>}
     */
    async isBetslipOpen(page) {
        return this.betslipObserver.isBetslipOpen(page);
    }

    /**
     * Checks the betslip notification area for odds changes or market suspensions.
     * @param {import('playwright').Page} page
     * @returns {Promise<{status: 'CLEAR'|'INTERRUPT_REQUIRED', reason?: string, detail?: string}>}
     */
    async checkInterrupts(page) {
        return this.betslipObserver.checkInterrupts(page);
    }

    /**
     * Identifies the active trigger for the betslip based on UI state,
     * and returns a generic CLICK command to open it.
     * @param {import('playwright').Page} page
     * @returns {Promise<Object>} Command payload
     */
    async translateOpenBetslip(page) {
        return this.submissionController.translateOpenBetslip(page);
    }

    /**
     * Converts a numeric stake into a sequence of EVENT_BURST Macro commands
     * spaced by 250ms MACRO_DELAYs.
     * @param {number} amount
     * @returns {Array<Object>} Array of Command payloads
     */
    translateStake(amount) {
        return this.keyboardController.translateStake(amount);
    }

    /**
     * Translates the Place Bet intent into a strictly non-idempotent generic CLICK.
     * @returns {Object} Command payload
     */
    translatePlaceBet() {
        return this.submissionController.translatePlaceBet();
    }

    /**
     * Translates the Place Bet intent into an ATOMIC_PLACE_BET command that performs
     * TOCTOU validation natively inside the browser event loop before clicking.
     * @param {number} expectedOdds
     * @returns {Object} Command payload
     */
    translateAtomicPlaceBet(expectedOdds) {
        return this.submissionController.translateAtomicPlaceBet(expectedOdds);
    }

    /**
     * Returns a generic CLICK command to accept an odds change notification.
     * @returns {Object} Command payload
     */
    translateAcceptOdds() {
        return this.submissionController.translateAcceptOdds();
    }
}
