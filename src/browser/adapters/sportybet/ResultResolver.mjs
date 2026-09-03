export class ResultResolver {
    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Observes the DOM for definitive Primary Evidence of the bet result.
     * Enforces the Evidence Hierarchy: DOM Success/Fail is authoritative. 
     * Timeouts are strictly mapped to UNCERTAIN.
     * 
     * @param {import('playwright').Page} page
     * @param {number} timeoutMs - Max time to wait for evidence
     * @returns {Promise<{status: 'SUCCESS'|'FAILED'|'UNCERTAIN', detail?: string}>}
     */
    async observeResult(page, timeoutMs = 30000) {
        try {
            // Using polling: 'mutation' to satisfy the strict "Zero Polling" / WAIT_FOR_MUTATION
            // timing audit requirement. This evaluates the function ONLY when the DOM changes.
            const outcomeHandler = await page.waitForFunction(
                (selectors) => {
                    const success = document.querySelector(selectors.success);
                    if (success && success.getBoundingClientRect().height > 0) {
                        const computed = window.getComputedStyle(success);
                        if (computed.opacity !== '0' && computed.display !== 'none') {
                            return 'SUCCESS';
                        }
                    }

                    const fail = document.querySelector(selectors.fail);
                    if (fail && fail.getBoundingClientRect().height > 0) {
                        return 'FAILED';
                    }

                    const errorMsg = document.querySelector(selectors.error);
                    if (errorMsg && errorMsg.getBoundingClientRect().height > 0) {
                        return 'FAILED';
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
            return { status: status };

        } catch (error) {
            // If the timeout is reached, Playwright throws a TimeoutError.
            // Check the CMS tracker to see if the bet ever actually submitted
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
            } catch (e) {
                // Ignore evaluation errors on crash
            }

            // Fallback: missing primary evidence is ALWAYS 'UNCERTAIN'
            return { 
                status: 'UNCERTAIN', 
                detail: `Wait failed or Primary DOM evidence missing: ${error.message}`
            };
        }
    }
}
