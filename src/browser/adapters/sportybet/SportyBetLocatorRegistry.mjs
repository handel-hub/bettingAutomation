export class SportyBetLocatorRegistry {
    constructor() {
        // --------------------------------------------------------------------
        // STABLE ANCESTORS & BALANCE
        // --------------------------------------------------------------------
        this.sessionBalanceContainer = '.has-login.ml-auto'; // Navbar / Home page
        this.betslipBalanceContainer = '.user-assets-panel .has-login.ml-auto'; // Specific leaf node for balance
        
        // --------------------------------------------------------------------
        // BETSLIP TRIGGERS (Opening the slip)
        // --------------------------------------------------------------------
        this.fastBetslipTrigger = '.m-fast-betslip';
        this.bottomNavBetslipTrigger = '.m-bottom-nav-item:has-text("Betslip")';
        this.themeIconTrigger = '.betslip-theme-icon__inner';
        
        // Success Dialog Actions
        this.rebetTrigger = 'button[data-op="betslip-success-rebet"], [data-cms-key="rebet"], .m-btn-rebet, button:has-text("Rebet"), button:has-text("REBET")';
        this.successOkButton = 'button[data-op="betslip-success-ok"], [data-cms-key="ok"], .m-btn-confirm';

        // --------------------------------------------------------------------
        // BETSLIP CONTAINERS & COMPONENTS
        // --------------------------------------------------------------------
        this.fastBetslipWrap = '.m-fast-betslip-wrap';
        this.outcomeOdds = '.m-fast-betslip-wrap .m-outcome-odds';
        
        // --------------------------------------------------------------------
        // STAKE & KEYBOARD
        // --------------------------------------------------------------------
        this.stakeInput = '.m-fast-betslip-wrap .m-betslips-stake .m-keybord-input, .m-betslips-stake .m-keybord-input';
        
        // --------------------------------------------------------------------
        // ACTION BUTTONS
        // --------------------------------------------------------------------
        // We target the inner span with data-op because SportyBet uses strict event delegation on this attribute
        this.placeBetButton = '.place-bet [data-op$="placebet"]';
        this.flexibetConfirmButton = '.flexibet-confirm';
        this.processingButton = '.af-button--process';
        this.acceptOddsButton = '.betslip-notification .af-button--primary';
        
        // --------------------------------------------------------------------
        // NOTIFICATIONS & RESULTS
        // --------------------------------------------------------------------
        this.betslipNotification = '.betslip-notification';
        this.successIcon = '.success-wrap, .dialog-container.fast-betslip-success';
        this.failIcon = '.m-icon-fail';
        this.errorMsg = '.fs-m-error';
    }

    /**
     * Retrieves the exact DOM selector for a virtual keyboard key.
     * Appends >> nth=0 to safely bypass Playwright strict mode if multiple 
     * keyboard components (e.g., Single/Multiple/System tabs) exist in the DOM.
     * @param {string} key - e.g., "5", "clear", "done"
     * @returns {string} Selector
     */
    getKeySelector(key) {
        return `[data-key="${key}"] >> nth=0`;
    }
}
