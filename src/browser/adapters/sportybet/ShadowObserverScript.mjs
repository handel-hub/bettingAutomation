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
        const isOpen = wrap && window.getComputedStyle(wrap).display !== 'none';
        
        if (!isOpen) return { isOpen: false, odds: null, stake: null };

        const oddsEl = document.querySelector('.m-outcome-odds');
        const stakeEl = document.querySelector('.m-betslips-stake .m-keybord-input');
        
        let odds = null;
        let stake = null;

        if (oddsEl) {
            const parsed = parseFloat(oddsEl.innerText);
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

    // Attach MutationObserver to the body but filter rapidly
    const observer = new MutationObserver((mutations) => {
        let shouldReport = false;
        for (const mut of mutations) {
            // Check if mutation is related to odds, stake, or betslip container
            if (mut.target.classList) {
                const cls = mut.target.className;
                if (typeof cls === 'string' && (
                    cls.includes('m-outcome-odds') || 
                    cls.includes('m-keybord-input') || 
                    cls.includes('m-fast-betslip-wrap') ||
                    cls.includes('betslip')
                )) {
                    shouldReport = true;
                    break;
                }
            }
            // Catch cases where child text nodes change
            if (mut.target.parentNode && mut.target.parentNode.classList) {
                const cls = mut.target.parentNode.className;
                if (typeof cls === 'string' && (
                    cls.includes('m-outcome-odds') || 
                    cls.includes('m-keybord-input')
                )) {
                    shouldReport = true;
                    break;
                }
            }
        }
        
        if (shouldReport) {
            // Use requestAnimationFrame to coalesce rapid DOM paints
            requestAnimationFrame(reportState);
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
