import { CapabilityProvider } from './CapabilityProvider.mjs';
import { CapabilityResult } from '../models/CapabilityResult.mjs';
import { Capabilities } from '../capabilities.mjs';
import { logger } from '../../../config.mjs';

export class DOMCapabilityProvider extends CapabilityProvider {
    supportedCapabilities() {
        return [Capabilities.DOM_READY];
    }

    async currentStatus(syncContext) {
        // Instant check
        const { browserId, page } = syncContext;
        try {
            const isReady = await page.evaluate(() => {
                return document.readyState === 'complete';
            });
            if (isReady) {
                return new CapabilityResult({
                    status: 'SATISFIED',
                    capability: Capabilities.DOM_READY,
                    reason: 'DOM instantly ready'
                });
            }
            return new CapabilityResult({
                status: 'WAITING',
                capability: Capabilities.DOM_READY,
                reason: 'document.readyState not complete'
            });
        } catch (e) {
            return new CapabilityResult({
                status: 'FAILED',
                capability: Capabilities.DOM_READY,
                reason: e.message
            });
        }
    }

    async waitFor(syncContext) {
        const { browserId, page, deadline, context: executionContext } = syncContext;
        const startTime = Date.now();
        const profile = executionContext.command.metadata.profile || {};
        const quietPeriod = profile.domQuietPeriod !== undefined ? profile.domQuietPeriod : 100;
        const maxWait = deadline - startTime;

        if (maxWait <= 0) {
            return new CapabilityResult({
                status: 'TIMEOUT',
                capability: Capabilities.DOM_READY,
                reason: 'Deadline exceeded before execution'
            });
        }

        try {
            logger.debug(`[DOMProvider] [${browserId}] Waiting for DOM stabilization (quiet period: ${quietPeriod}ms)`);
            
            // Wait for DOM to stabilize using page.evaluate
            const isStable = await page.evaluate(async ({ maxWait, quietPeriod }) => {
                return new Promise((resolve) => {
                    let timeoutId;
                    let failsafeId;
                    let observer;

                    const clearAll = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        if (failsafeId) clearTimeout(failsafeId);
                        if (observer) observer.disconnect();
                    };

                    const onStable = () => {
                        clearAll();
                        // Final step: requestAnimationFrame to guarantee layout calculations
                        requestAnimationFrame(() => {
                            resolve(true);
                        });
                    };

                    const restartTimer = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        if (quietPeriod > 0) {
                            timeoutId = setTimeout(onStable, quietPeriod);
                        } else {
                            onStable();
                        }
                    };

                    const checkReadyState = () => {
                        if (document.readyState === 'complete') {
                            restartTimer();
                            
                            // Also observe mutations to catch hydration
                            if (quietPeriod > 0) {
                                observer = new MutationObserver(() => {
                                    // DOM mutated! Reset the quiet period.
                                    restartTimer();
                                });
                                observer.observe(document.body, { childList: true, subtree: true, attributes: true });
                            }
                        } else {
                            window.addEventListener('load', () => {
                                checkReadyState();
                            }, { once: true });
                        }
                    };

                    // Failsafe if the stabilization takes longer than the barrier's maxWait
                    failsafeId = setTimeout(() => {
                        clearAll();
                        resolve(false);
                    }, maxWait);

                    checkReadyState();
                });
            }, { maxWait, quietPeriod });

            const latency = Date.now() - startTime;

            if (isStable) {
                return new CapabilityResult({
                    status: 'SATISFIED',
                    capability: Capabilities.DOM_READY,
                    latency,
                    telemetry: { domQuietPeriod: quietPeriod },
                    reason: 'DOM stabilized and quiet window elapsed'
                });
            } else {
                return new CapabilityResult({
                    status: 'TIMEOUT',
                    capability: Capabilities.DOM_READY,
                    latency,
                    reason: 'DOM never stabilized within deadline'
                });
            }
        } catch (e) {
            const latency = Date.now() - startTime;
            return new CapabilityResult({
                status: 'FAILED',
                capability: Capabilities.DOM_READY,
                latency,
                reason: e.message
            });
        }
    }

    async invalidate(syncContext) {
        // No-op for now. Invalidation would be triggered if a navigation starts.
    }
}
