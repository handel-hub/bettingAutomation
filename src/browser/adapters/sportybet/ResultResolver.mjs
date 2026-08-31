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
                    // Use getBoundingClientRect to protect against 0x0 hidden parent containers
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

                    return false; // Keep waiting
                },
                {
                    success: this.registry.successIcon,
                    fail: this.registry.failIcon,
                    error: this.registry.errorMsg
                },
                { timeout: timeoutMs, polling: 'mutation' }
            );

            const status = await outcomeHandler.jsonValue();
            return { status: status };

        } catch (error) {
            // If the timeout is reached, Playwright throws a TimeoutError.
            // As per the Evidence Hierarchy, missing primary evidence is ALWAYS 'UNCERTAIN',
            // preventing catastrophic false-failures on network desyncs.
            return { 
                status: 'UNCERTAIN', 
                detail: `Primary DOM evidence missing after ${timeoutMs}ms. Vue.js render may have failed or network is hung.`
            };
        }
    }
}
