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
            const frames = page.frames();
            const results = await Promise.all(frames.map(frame => 
                frame.evaluate(() => document.readyState === 'complete').catch(() => true)
            ));
            const isReady = results.every(res => res === true);
            
            if (isReady) {
                return new CapabilityResult({
                    status: 'SATISFIED',
                    capability: Capabilities.DOM_READY,
                    reason: 'All frames instantly ready'
                });
            }
            return new CapabilityResult({
                status: 'WAITING',
                capability: Capabilities.DOM_READY,
                reason: 'One or more frames not complete'
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
            logger.debug(`[DOMProvider] [${browserId}] Waiting for DOM stabilization across all frames (quiet period: ${quietPeriod}ms)`);
            
            const frames = page.frames();
            const stablePromises = frames.map(frame => 
                frame.evaluate(async ({ maxWait, quietPeriod }) => {
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
                            if (typeof requestAnimationFrame !== 'undefined') {
                                requestAnimationFrame(() => resolve(true));
                            } else {
                                resolve(true);
                            }
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
                                if (quietPeriod > 0 && document.body) {
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
                }, { maxWait, quietPeriod }).catch(() => true) // Detached or cross-origin-destroyed frames are treated as stable
            );

            const results = await Promise.all(stablePromises);
            const isStable = results.every(r => r === true);

            const latency = Date.now() - startTime;

            if (isStable) {
                return new CapabilityResult({
                    status: 'SATISFIED',
                    capability: Capabilities.DOM_READY,
                    latency,
                    telemetry: { domQuietPeriod: quietPeriod },
                    reason: 'All frames stabilized and quiet window elapsed'
                });
            } else {
                return new CapabilityResult({
                    status: 'TIMEOUT',
                    capability: Capabilities.DOM_READY,
                    latency,
                    reason: 'One or more frames never stabilized within deadline'
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
        const { browserId, page } = syncContext;
        try {
            // Force a fresh measurement to repair reality
            const frames = page.frames();
            const results = await Promise.all(frames.map(frame => 
                frame.evaluate(() => document.readyState === 'complete').catch(() => true)
            ));
            const isReady = results.every(res => res === true);
            
            // We publish this new state to the registry, which acts as our Soft Reset
            const currentEpoch = this.registry.getState(browserId).navigationEpoch;
            
            this.registry.update(browserId, {
                capabilities: { 
                    [Capabilities.DOM_READY]: { 
                        value: isReady, 
                        // If it's still false, we can bump the epoch so consumers know it was re-evaluated
                        epoch: currentEpoch + (isReady ? 0 : 1) 
                    } 
                }
            });

            if (this.syncManager.coordinator) {
                this.syncManager.coordinator.handleCapabilityUpdate(browserId, Capabilities.DOM_READY, isReady);
            }
        } catch (e) {
            logger.warn(`[DOMProvider] Invalidation measurement failed: ${e.message}`);
        }
    }
}
