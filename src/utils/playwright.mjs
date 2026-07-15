export async function raceWithCleanup(page, successFn, errorFn, timeoutMs = 15000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
        if (await successFn()) return { outcome: 'success' };
        
        try {
            const errorResult = await errorFn();
            if (errorResult) return { outcome: 'error', message: errorResult };
        } catch (e) {
            // Ignore temporary errors during polling
        }
        
        await page.waitForTimeout(200);
    }
    
    throw new Error(`Race timeout after ${timeoutMs}ms`);
}
