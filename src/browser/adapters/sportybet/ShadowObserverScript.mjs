/**
 * Script injected into the Master browser to natively observe the Betslip.
 * Emits lightweight JSON updates to Node.js via page.exposeBinding('__shadowObserverReport').
 */
export const SHADOW_OBSERVER_SCRIPT = `
(() => {
    if (window.__shadowObserverInjected) return;
    window.__shadowObserverInjected = true;

    let lastReport = '';

    function getBetslipState() {
        const wrap = document.querySelector('.m-fast-betslip-wrap');
        
        // Use getBoundingClientRect to ensure it's actually rendered on screen.
        // This natively handles cases where a parent sets display:none, causing the fixed wrap to collapse to 0x0.
        const isOpen = wrap && wrap.getBoundingClientRect().height > 0;
        
        if (!isOpen) return { isOpen: false, odds: null, stake: null };

        const oddsEl = document.querySelector('.m-outcome-odds');
        const stakeEl = document.querySelector('.m-betslips-stake .m-keybord-input');
        
        let odds = null;
        let stake = null;

        if (oddsEl) {
            // Fallback to textContent if innerText fails due to rendering quirks
            const text = oddsEl.innerText || oddsEl.textContent || '';
            const parsed = parseFloat(text);
            if (!isNaN(parsed)) odds = parsed;
        }

        if (stakeEl) {
            // Virtual keyboard input might use innerText or textContent depending on framework
            const text = stakeEl.innerText || stakeEl.textContent || '';
            const parsed = parseFloat(text.replace(/,/g, ''));
            if (!isNaN(parsed)) stake = parsed;
        }

        return { isOpen: true, odds, stake };
    }

    function reportState() {
        const state = getBetslipState();
        const stateString = JSON.stringify(state);
        
        // Debounce / deduplicate identical reports
        if (stateString !== lastReport) {
            lastReport = stateString;
            if (window.__shadowObserverReport) {
                window.__shadowObserverReport(state).catch(() => {});
            }
        }
    }

    // Report immediately on load
    reportState();

    // Attach MutationObserver to the body.
    // We trigger on any mutation but debounce heavily via requestAnimationFrame to avoid missing
    // parent-level class changes (e.g. .m-bottom-nav toggling display: none)
    let reportTimeout = null;
    const observer = new MutationObserver(() => {
        if (!reportTimeout) {
            reportTimeout = requestAnimationFrame(() => {
                reportState();
                reportTimeout = null;
            });
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    // --- HARDWARE OVERRIDE DETECTION ---
    function handleTrustedInteraction(e) {
        if (!e.isTrusted) return; // Ignore our own synthetic EVENT_BURST dispatches
        const target = e.target;
        if (target && target.closest) {
            if (target.closest('.m-keyboard') || target.closest('.m-betslips-stake')) {
                if (window.__manualOverrideReport) {
                    window.__manualOverrideReport().catch(() => {});
                }
            }
        }
    }

    document.addEventListener('click', handleTrustedInteraction, { capture: true, passive: true });
    document.addEventListener('touchstart', handleTrustedInteraction, { capture: true, passive: true });
    document.addEventListener('keydown', handleTrustedInteraction, { capture: true, passive: true });

})();
`;
