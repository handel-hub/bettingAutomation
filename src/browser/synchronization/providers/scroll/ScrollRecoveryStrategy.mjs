import { logger } from '../../../../config.mjs';
import featureFlags from '../../../execution/locatorIntelligence/FeatureFlags.mjs';

/**
 * Handles layout clamping (SY-135) by waiting for ResizeObserver mutations
 * or 300ms layout expansion.
 */
export class ScrollRecoveryStrategy {
    constructor(browserId, page) {
        this.browserId = browserId;
        this.page = page;
    }

    async attemptRecovery(error) {
        if (!featureFlags.isEnabled('V4_SCROLL_CLAMPING')) {
            return false;
        }

        const msg = error.message || '';
        if (msg.includes('[SY-135]')) {
            logger.info(`[ScrollRecovery] SY-135 Clamping Required for ${this.browserId}. Waiting for layout expansion...`);
            
            try {
                await this.page.evaluate(() => {
                    return new Promise(resolve => {
                        let resolved = false;
                        const observer = new ResizeObserver(() => {
                            if (!resolved) {
                                resolved = true;
                                observer.disconnect();
                                resolve(true);
                            }
                        });
                        observer.observe(document.documentElement);
                        
                        setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                observer.disconnect();
                                resolve(false);
                            }
                        }, 300);
                    });
                });
                logger.info(`[ScrollRecovery] Layout wait complete for ${this.browserId}.`);
                return true; 
            } catch (e) {
                logger.warn(`[ScrollRecovery] Failed to wait for layout on ${this.browserId}: ${e.message}`);
                return false;
            }
        }
        
        return false;
    }
}
