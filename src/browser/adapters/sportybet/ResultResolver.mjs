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
            // We use page.waitForFunction to rapidly poll the __cmsTracker
            const outcomeHandler = await page.waitForFunction(
                (selectors) => {
                    const tracker = window.__cmsTracker;
                    if (!tracker) return false;

                    // 1. Detect if the transient state has resolved
                    let submittingFinished = false;
                    for (const entry of tracker.log) {
                        const key = entry.key ? entry.key.toLowerCase() : '';
                        if (key === 'submitting' && (entry.event === 'removed' || entry.event === 'attr_removed')) {
                            submittingFinished = true;
                        }
                    }

                    // 2. Check explicitly for termination states in the log
                    let hasSuccessKey = false;
                    let hasFailKey = false;
                    for (const entry of tracker.log) {
                        const key = entry.key ? entry.key.toLowerCase() : '';
                        if (key.includes('rebet') || key.includes('ok') || key === 'betslip_success_ok' || key === 'betslip_success_rebet') {
                            hasSuccessKey = true;
                        }
                        if (key.includes('fail') || key.includes('error')) {
                            hasFailKey = true;
                        }
                    }

                    // If submitting is done, or we saw a definitive key, resolve it
                    if (submittingFinished || hasSuccessKey || hasFailKey) {
                        if (hasSuccessKey) return 'SUCCESS';
                        if (hasFailKey) return 'FAILED';

                        // 3. Fallback CSS checks if CMS keys for success/fail weren't found
                        const success = document.querySelector(selectors.success);
                        if (success && success.getBoundingClientRect().height > 0) {
                            return 'SUCCESS';
                        }
                        const fail = document.querySelector(selectors.fail);
                        if (fail && fail.getBoundingClientRect().height > 0) {
                            return 'FAILED';
                        }
                        const errorMsg = document.querySelector(selectors.error);
                        if (errorMsg && errorMsg.getBoundingClientRect().height > 0) {
                            return 'FAILED';
                        }
                    }

                    return false; // Keep waiting
                },
                {
                    success: this.registry.successIcon,
                    fail: this.registry.failIcon,
                    error: this.registry.errorMsg
                },
                { timeout: timeoutMs, polling: 'raf' }
            );

            const status = await outcomeHandler.jsonValue();
            
            // Allow a tiny deterministic buffer after the CMS state resolves to ensure Vue has physically 
            // mounted the target buttons before returning control to the orchestrator.
            await page.waitForTimeout(150);

            return { status: status };

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
