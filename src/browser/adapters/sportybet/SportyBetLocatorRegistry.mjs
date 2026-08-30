export class SportyBetLocatorRegistry {
    constructor() {
        // --------------------------------------------------------------------
        // STABLE ANCESTORS & BALANCE
        // --------------------------------------------------------------------
        this.sessionBalanceContainer = '.avatar-box'; // Navbar / Home page
        this.betslipBalanceContainer = '.user-assets-panel'; // Inside the betslip header
        
        // --------------------------------------------------------------------
        // BETSLIP TRIGGERS (Opening the slip)
        // --------------------------------------------------------------------
        this.fastBetslipTrigger = '.m-fast-betslip';
        this.bottomNavBetslipTrigger = '.m-bottom-nav-item:has-text("Betslip")';
        this.themeIconTrigger = '.betslip-theme-icon__inner';
        this.rebetTrigger = 'button.af-button.rebet';

        // --------------------------------------------------------------------
        // BETSLIP CONTAINERS & COMPONENTS
        // --------------------------------------------------------------------
        this.fastBetslipWrap = '.m-fast-betslip-wrap';
        this.outcomeOdds = '.m-outcome-odds';
        
        // --------------------------------------------------------------------
        // STAKE & KEYBOARD
        // --------------------------------------------------------------------
        this.stakeInput = '.m-betslips-stake .m-keybord-input';
        
        // --------------------------------------------------------------------
        // ACTION BUTTONS
        // --------------------------------------------------------------------
        this.placeBetButton = '.place-bet.real-theme';
        this.processingButton = '.af-button--process';
        this.acceptOddsButton = '.betslip-notification .af-button--primary';
        
        // --------------------------------------------------------------------
        // NOTIFICATIONS & RESULTS
        // --------------------------------------------------------------------
        this.betslipNotification = '.betslip-notification';
        this.successIcon = '.m-icon-success';
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
