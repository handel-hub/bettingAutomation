export class LocatorResolver {
    /**
     * Resolves the safest actionable locator from a list of candidates.
     * @param {import('playwright').Page} page
     * @param {Array<{strategy: string, locator: string, confidence: number, rank: number}>} candidates
     * @returns {Promise<{locator: import('playwright').Locator, candidate: any} | null>}
     */
    static async resolve(page, candidates) {
        if (!candidates || candidates.length === 0) return null;
        
        // Ensure candidates are sorted by confidence (descending)
        const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);

        for (const candidate of sorted) {
            try {
                // Use the Playwright locator
                const locator = page.locator(candidate.locator);
                
                // Fast check: Wait briefly for it to be attached
                await locator.waitFor({ state: 'attached', timeout: 250 });
                
                const isVisible = await locator.isVisible();
                if (!isVisible) continue;

                // Return the resolved locator and its metadata
                return { locator, candidate };
            } catch (err) {
                // Timeout or error, move to next candidate
                continue;
            }
        }
        
        return null;
    }

    /**
     * Resolves candidates and safely executes an action on the best locator.
     */
    static async execute(page, candidates, actionName, actionFn) {
        const resolved = await this.resolve(page, candidates);
        if (!resolved) {
            throw new Error(`LocatorResolver failed to find any actionable candidates for action: ${actionName}`);
        }
        
        // Execute the provided action function on the resolved locator
        await actionFn(resolved.locator);
        
        return resolved.candidate; // Return the metadata of what was used
    }
}
