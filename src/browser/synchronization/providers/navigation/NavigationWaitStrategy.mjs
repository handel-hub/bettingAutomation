import { NavigationComparator, NavigationComparisonResult } from './NavigationComparator.mjs';
import { NavigationLifecycle } from '../../models/BrowserStateModel.mjs';
import { CapabilityResult } from '../../models/CapabilityResult.mjs';
import { Capabilities } from '../../capabilities.mjs';

export class NavigationWaitStrategy {
    constructor(browserId, registry, providerEventEmitter) {
        this.browserId = browserId;
        this.registry = registry;
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
                this.registry.removeListener('StateUpdated', onStateUpdate);
                this.providerEventEmitter.removeListener('navigationFailed', onNavigationFailed);
                if (page) page.removeListener('close', onPageClose);
            };

            const complete = (result) => {
                if (isResolved) return;
                cleanup();
                
                if (result.status === 'SATISFIED') {
                    resolve(result);
                } else {
                    reject(new Error(result.reason || 'Navigation wait failed'));
                }
            };

            const evaluate = () => {
                const state = this.registry.getState(this.browserId);
                const navCtx = state.navigationContext;
                
                if (!targetUrl) {
                    if (navCtx.lifecycle === NavigationLifecycle.READY || navCtx.lifecycle === NavigationLifecycle.IDLE) {
                        complete(new CapabilityResult({
                            status: 'SATISFIED',
                            capability: Capabilities.NAVIGATION_READY,
                            latency: Date.now() - startTime,
                            reason: 'Navigation idle or ready with no target URL'
                        }));
                        return true;
                    }
                    return false; // Keep waiting
                }

                const comparison = NavigationComparator.compare(targetUrl, navCtx);
                
                if (comparison === NavigationComparisonResult.MATCH || comparison === NavigationComparisonResult.NORMALIZED_MATCH) {
                    if (navCtx.lifecycle === NavigationLifecycle.READY || navCtx.lifecycle === NavigationLifecycle.IDLE) {
                        complete(new CapabilityResult({
                            status: 'SATISFIED',
                            capability: Capabilities.NAVIGATION_READY,
                            latency: Date.now() - startTime,
                            reason: 'Target URL matched'
                        }));
                        return true;
                    }
                } else if (comparison === NavigationComparisonResult.MISMATCH) {
                    // Check if the navigation is complete but we ended up somewhere else
                    if (navCtx.lifecycle === NavigationLifecycle.READY) {
                        // SY-114 Navigation Divergence
                        complete(new CapabilityResult({
                            status: 'FAILED',
                            capability: Capabilities.NAVIGATION_READY,
                            reason: `[SY-114] Navigation Divergence: Expected ${targetUrl}, but arrived at ${navCtx.currentURL}`
                        }));
                        return true;
                    }
                }
                
                // If redirecting or temporarily diverged, we keep waiting
                return false;
            };

            const onStateUpdate = ({ browserId, state }) => {
                if (browserId === this.browserId) {
                    try { evaluate(); } catch (e) { 
                        complete(new CapabilityResult({
                            status: 'FAILED',
                            capability: Capabilities.NAVIGATION_READY,
                            reason: e.message
                        })); 
                    }
                }
            };

            const onNavigationFailed = (reason) => {
                complete(new CapabilityResult({
                    status: 'FAILED',
                    capability: Capabilities.NAVIGATION_READY,
                    reason
                }));
            };

            const onPageClose = () => {
                complete(new CapabilityResult({
                    status: 'FAILED',
                    capability: Capabilities.NAVIGATION_READY,
                    reason: '[SY-113] Navigation cancelled: Page closed'
                }));
            };

            try {
                if (evaluate()) return;
            } catch (e) {
                return reject(e);
            }

            try {
                // Setup listeners
                this.registry.on('StateUpdated', onStateUpdate);
                this.providerEventEmitter.on('navigationFailed', onNavigationFailed);
                if (page) page.on('close', onPageClose);

                // Setup timeout
                timeoutId = setTimeout(() => {
                    const state = this.registry.getState(this.browserId);
                    const navCtx = state.navigationContext;
                    
                    if (navCtx.lifecycle === NavigationLifecycle.REDIRECTING) {
                        complete(new CapabilityResult({
                            status: 'TIMEOUT',
                            capability: Capabilities.NAVIGATION_READY,
                            reason: '[SY-111] Stuck in redirect loop'
                        }));
                    } else if (navCtx.lifecycle === NavigationLifecycle.NAVIGATING) {
                        complete(new CapabilityResult({
                            status: 'TIMEOUT',
                            capability: Capabilities.NAVIGATION_READY,
                            reason: '[SY-112] Navigation stalled'
                        }));
                    } else {
                        complete(new CapabilityResult({
                            status: 'TIMEOUT',
                            capability: Capabilities.NAVIGATION_READY,
                            reason: 'Navigation timed out'
                        }));
                    }
                }, timeoutMs);
            } catch (e) {
                cleanup();
                reject(e);
            }
        });
    }
}
