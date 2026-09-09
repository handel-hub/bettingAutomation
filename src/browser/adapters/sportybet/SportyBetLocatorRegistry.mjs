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
        this.rebetTrigger = 'button[data-op="betslip-success-rebet"], button.m-btn-rebet';
        this.successOkButton = 'button[data-op="betslip-success-ok"], button[data-cms-key="ok"], button.m-btn-confirm';

        // --------------------------------------------------------------------
        // BETSLIP CONTAINERS & COMPONENTS
        // --------------------------------------------------------------------
        this.fastBetslipWrap = '.m-fast-betslip-wrap';
        this.outcomeOdds = '.m-fast-betslip-wrap .m-outcome-odds';
        
        // --------------------------------------------------------------------
        // STAKE & KEYBOARD
        // --------------------------------------------------------------------
        this.stakeInput = '.m-fast-betslip-wrap .m-betslips-stake .m-keybord-input, .m-betslips-stake .m-keybord-input';
        this.confirmStakeText = '[data-op="betslip-confirm-wrap"] .stake-num';
        
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

        // --------------------------------------------------------------------
        // CASHOUT SUBSYSTEM
        // --------------------------------------------------------------------
        this.cashoutButton = 'button.m-btn--cashout, [data-op="openbet__cashout_btn"], .m-btn-cashout';
        this.cashoutItemWrapper = '[data-op*="openbet-item-wrapper-"], [data-op*="openbet-simple-list-item-"]';
        this.cashoutConfirmModal = '.m-cashout-pop, .af-modal--cashout';
        this.cashoutConfirmButton = '.m-cashout-pop .af-button--primary, .af-modal--cashout .af-button--primary, button[data-op="cashout-confirm"]';
        this.cashoutSuccessPopup = '[data-op="open_bets__cashout_success_popup"]';
        this.cashoutSuccessPopupClose = '[data-op="open_bets__cashout_success_popup_close"]';
        this.cashoutSuccessToast = '.m-toast--success, .m-notice--success, .m-msg--success, .m-alert--success, .m-toast, [class*="toast"]';
        this.cashoutErrorToast = '.m-toast--error, .m-notice--error, .m-msg--error, .m-alert--error, .fs-m-error';
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
