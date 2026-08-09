/**
 * Viewport Recovery Strategy.
 * Attempts to automatically resize the Slave's viewport 
 * via CDP or Playwright page.setViewportSize if a mismatch is detected.
 */
export class ViewportRecoveryStrategy {
    constructor(browserId, page) {
        this.browserId = browserId;
        this.page = page;
    }

    async attemptRecovery(expectedViewport, actualViewport) {
        if (!this.page || !expectedViewport) {
            return false;
        }

        try {
            const width = Math.round(expectedViewport.width || expectedViewport.layoutViewportWidth || 1280);
            const height = Math.round(expectedViewport.height || expectedViewport.layoutViewportHeight || 720);
            const deviceScaleFactor = expectedViewport.dpr || 1;
            const mobile = expectedViewport.isMobile || false;

            if (this.page.context && typeof this.page.context().newCDPSession === 'function') {
                const cdp = await this.page.context().newCDPSession(this.page);
                await cdp.send('Emulation.setDeviceMetricsOverride', {
                    width,
                    height,
                    deviceScaleFactor,
                    mobile
                });
                return true;
            } else if (typeof this.page.setViewportSize === 'function') {
                await this.page.setViewportSize({ width, height });
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    }
}
