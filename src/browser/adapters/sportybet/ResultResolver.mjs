export class ResultResolver {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Observes the DOM for definitive Primary Evidence of the bet result.
     * Evaluates the __cmsTracker log natively injected by ATOMIC_PLACE_BET
     * to deterministically track the state machine.
     * 
     * @param {import('playwright').Page} page
     * @param {number} timeoutMs - Max time to wait for evidence
     * @returns {Promise<{status: 'SUCCESS'|'FAILED'|'UNCERTAIN', detail?: string}>}
     */
    async observeResult(page, timeoutMs = 30000) {
        try {
            // 1. Wait for the transient 'submitting' state to finish OR a definitive key to appear
            const outcomeHandler = await page.waitForFunction(
                () => {
                    const tracker = window.__cmsTracker;
                    if (!tracker) return false;

                    for (const entry of tracker.log) {
                        const key = entry.key ? entry.key.toLowerCase() : '';
                        
                        // If submitting is explicitly removed, transient state is over
                        if (key === 'submitting' && (entry.event === 'removed' || entry.event === 'attr_removed')) {
                            return 'SUBMITTING_FINISHED';
                        }
                        
                        // If we see definitive keys early, we can shortcut
                        if (key.includes('rebet') || key.includes('ok') || key === 'betslip_success_ok' || key === 'betslip_success_rebet') {
                            return 'SUCCESS_KEY_SEEN';
                        }
                        if (key.includes('fail') || key.includes('error')) {
                            return 'FAIL_KEY_SEEN';
                        }
                    }

                    return false; // Keep waiting
                },
                null,
                { timeout: timeoutMs, polling: 'raf' }
            );

            const initialStatus = await outcomeHandler.jsonValue();

            // 2. Wait exactly 1 frame (16ms) for Vue.js to mount the new DOM elements
            await page.waitForTimeout(16);

            // 3. Evaluate the definitive outcome
            const finalStatus = await page.evaluate((selectors) => {
                const tracker = window.__cmsTracker;
                if (tracker) {
                    for (const entry of tracker.log) {
                        const key = entry.key ? entry.key.toLowerCase() : '';
                        if (key.includes('rebet') || key.includes('ok') || key === 'betslip_success_ok' || key === 'betslip_success_rebet') return 'SUCCESS';
                        if (key.includes('fail') || key.includes('error')) return 'FAILED';
                    }
                }

                // Fallback CSS checks
                const success = document.querySelector(selectors.success);
                if (success && success.getBoundingClientRect().height > 0) return 'SUCCESS';
                
                const fail = document.querySelector(selectors.fail);
                if (fail && fail.getBoundingClientRect().height > 0) return 'FAILED';
                
                const errorMsg = document.querySelector(selectors.error);
                if (errorMsg && errorMsg.getBoundingClientRect().height > 0) return 'FAILED';

                return 'UNCERTAIN';
            }, {
                success: this.registry.successIcon,
                fail: this.registry.failIcon,
                error: this.registry.errorMsg
            });

            // Add the 150ms deterministic buffer to ensure the buttons are fully interactable for the next macro
            await page.waitForTimeout(150);

            return { status: finalStatus };

        } catch (error) {
            try {
                const cmsData = await page.evaluate(() => window.__cmsTracker);
                if (cmsData) {
                    if (cmsData.processingSeen) {
                        return { 
                            status: 'UNCERTAIN', 
                            detail: `Wait failed, but processing state WAS detected. Bet is in flight. CMS Log: ${JSON.stringify(cmsData.log)}`
                        };
                    } else {
                        return { 
                            status: 'FAILED', 
                            detail: `Wait failed, and processing state was NEVER detected. The click likely swallowed. CMS Log: ${JSON.stringify(cmsData.log)}`
                        };
                    }
                }
            } catch (e) {}

            return { 
                status: 'UNCERTAIN', 
                detail: `Wait failed or Primary DOM evidence missing: ${error.message}`
            };
        }
    }
}
