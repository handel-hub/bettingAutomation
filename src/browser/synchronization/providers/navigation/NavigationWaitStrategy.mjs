import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { NavigationComparator, NavigationComparisonResult } from './NavigationComparator.mjs';
import { NavigationLifecycle, NavigationResult } from '../../models/BrowserStateModel.mjs';

export class NavigationWaitStrategy {
    constructor(browserId, providerEventEmitter) {
        this.browserId = browserId;
        this.providerEventEmitter = providerEventEmitter; // To emit and listen to provider-level events like navigationSettled
    }

    /**
     * @param {Object} syncContext 
     */
    async waitFor(syncContext) {
        const { deadline, context, page } = syncContext;
        const targetNavMetadata = context.command.metadata.navigation;
        let targetUrl;
        if (!targetNavMetadata || !targetNavMetadata.url) {
            targetUrl = null;
        } else {
            targetUrl = targetNavMetadata.url;
        }

        const targetNavId = targetNavMetadata?.navigationId;
        const startTime = Date.now();
        const timeoutMs = Math.max(0, deadline - startTime);

        return new Promise((resolve, reject) => {
            let isResolved = false;
            let timeoutId = null;

            const cleanup = () => {
                isResolved = true;
                if (timeoutId) clearTimeout(timeoutId);
                BrowserStateRegistry.removeListener('StateUpdated', onStateUpdate);
                this.providerEventEmitter.removeListener('navigationFailed', onNavigationFailed);
                page.removeListener('close', onPageClose);
            };

            const complete = (result) => {
                if (isResolved) return;
                cleanup();
                
                if (result.satisfied) {
                    resolve(result);
                } else {
                    reject(new Error(result.error));
                }
            };

            const evaluate = () => {
                const state = BrowserStateRegistry.getState(this.browserId);
                const navCtx = state.navigationContext;
                
                if (!targetUrl) {
                    if (navCtx.lifecycle === NavigationLifecycle.READY || navCtx.lifecycle === NavigationLifecycle.IDLE) {
                        complete({
                            satisfied: true,
                            capability: 'NAVIGATION_READY',
                            latency: Date.now() - startTime,
                            error: null
                        });
                        return true;
                    }
                    return false; // Keep waiting
                }

                const comparison = NavigationComparator.compare(targetUrl, navCtx);
                
                if (comparison === NavigationComparisonResult.MATCH || comparison === NavigationComparisonResult.NORMALIZED_MATCH) {
                    if (navCtx.lifecycle === NavigationLifecycle.READY || navCtx.lifecycle === NavigationLifecycle.IDLE) {
                        complete({
                            satisfied: true,
                            capability: 'NAVIGATION_READY',
                            latency: Date.now() - startTime,
                            error: null
                        });
                        return true;
                    }
                } else if (comparison === NavigationComparisonResult.MISMATCH) {
                    // Check if the navigation is complete but we ended up somewhere else
                    if (navCtx.lifecycle === NavigationLifecycle.READY) {
                        // SY-114 Navigation Divergence
                        complete({
                            satisfied: false,
                            error: `[SY-114] Navigation Divergence: Expected ${targetUrl}, but arrived at ${navCtx.currentURL}`
                        });
                        return true;
                    }
                }
                
                // If redirecting or temporarily diverged, we keep waiting
                return false;
            };

            const onStateUpdate = ({ browserId, state }) => {
                if (browserId === this.browserId) {
                    try { evaluate(); } catch (e) { complete({ satisfied: false, error: e.message }); }
                }
            };

            const onNavigationFailed = (reason) => {
                complete({ satisfied: false, error: reason });
            };

            const onPageClose = () => {
                complete({ satisfied: false, error: '[SY-113] Navigation cancelled: Page closed' });
            };

            try {
                if (evaluate()) return;
            } catch (e) {
                return reject(e);
            }

            try {
                // Setup listeners
                BrowserStateRegistry.on('StateUpdated', onStateUpdate);
                this.providerEventEmitter.on('navigationFailed', onNavigationFailed);
                if (page) page.on('close', onPageClose);

                // Setup timeout
                timeoutId = setTimeout(() => {
                    const state = BrowserStateRegistry.getState(this.browserId);
                    const navCtx = state.navigationContext;
                    
                    if (navCtx.lifecycle === NavigationLifecycle.REDIRECTING) {
                        complete({ satisfied: false, error: '[SY-110] Redirect timeout' });
                    } else if (navCtx.navigationType !== 'traditional') {
                        complete({ satisfied: false, error: '[SY-111] SPA route timeout' });
                    } else {
                        complete({ satisfied: false, error: '[SY-101] Navigation timeout' });
                    }
                }, timeoutMs);
            } catch (e) {
                cleanup();
                reject(e);
            }
        });
    }
}
