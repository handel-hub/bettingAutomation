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
        
        // Active Correction for Divergence
        if (error.name === 'CapabilityError' && (error.code === 'SY-136' || error.code === 'SY-130' || error.code === 'SY-131')) {
            logger.info(`[ScrollRecovery] Active Correction triggered for ${this.browserId} due to divergence.`);
            try {
                const expected = error.expectedState;
                if (expected && (expected.rhoX !== undefined || expected.rhoY !== undefined)) {
                    await this.page.evaluate(async ({rhoX, rhoY, containerId, anchorHash, anchorOffset}) => {
                            let target = document.documentElement;
                            if (containerId && containerId !== 'window') {
                                if (containerId.includes('=')) {
                                    target = document.querySelector(`[${containerId}]`);
                                } else {
                                    try {
                                        const iter = document.evaluate(containerId, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                        if (iter.singleNodeValue) target = iter.singleNodeValue;
                                    } catch(e) {}
                                }
                            }
                            if (target) {
                                // 1. Semantic Scroll Anchoring Recovery
                                if (anchorHash) {
                                    let anchorEl = null;
                                    if (anchorHash.includes('=')) {
                                        anchorEl = document.querySelector(`[${anchorHash}]`);
                                    } else {
                                        try {
                                            const iter = document.evaluate(anchorHash, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            if (iter.singleNodeValue) anchorEl = iter.singleNodeValue;
                                        } catch(e) {}
                                    }
                                    if (anchorEl) {
                                        anchorEl.scrollIntoView(true);
                                        if (anchorOffset) {
                                            if (target === document.documentElement) {
                                                window.scrollBy(0, -anchorOffset);
                                            } else {
                                                target.scrollTop -= anchorOffset;
                                            }
                                        }
                                        return; // Anchor recovery complete
                                    }
                                }

                                // 2. Fallback rho recovery
                                const limitX = Math.max(0, target.scrollWidth - target.clientWidth);
                                const limitY = Math.max(0, target.scrollHeight - target.clientHeight);
                                if (rhoX !== undefined && limitX > 0) target.scrollLeft = Math.round(rhoX * limitX);
                                if (rhoY !== undefined && limitY > 0) target.scrollTop = Math.round(rhoY * limitY);
                                if (target === document.documentElement) {
                                    window.scrollTo(
                                        rhoX !== undefined && limitX > 0 ? Math.round(rhoX * limitX) : window.pageXOffset,
                                        rhoY !== undefined && limitY > 0 ? Math.round(rhoY * limitY) : window.pageYOffset
                                    );
                                }
                            }
                        }, { rhoX: expected.rhoX, rhoY: expected.rhoY, containerId: expected.containerId, anchorHash: expected.anchorHash, anchorOffset: expected.anchorOffset });
                        // Wait a tick for the scroll event to fire and be processed
                        await new Promise(r => setTimeout(r, 100));
                        return true;
                }
            } catch (e) {
                logger.warn(`[ScrollRecovery] Active correction failed on ${this.browserId}: ${e.message}`);
            }
        }
        
        return false;
    }
}
