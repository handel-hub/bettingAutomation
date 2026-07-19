import { Capabilities } from '../../capabilities.mjs';
import { ViewportComparisonResult } from './ViewportComparator.mjs';
import { CapabilityResult } from '../../models/CapabilityResult.mjs';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { ViewportLifecycle } from '../../models/BrowserStateModel.mjs';
import { logger } from '../../../../config.mjs';

/**
 * Handles concurrent evaluation of Viewport readiness by evaluating
 * metadata against current runtime ViewportContext and reacting to ViewportReady events.
 */
export class ViewportWaitStrategy {
    constructor(browserId, stateMachine, comparator, policy) {
        this.browserId = browserId;
        this.stateMachine = stateMachine;
        this.comparator = comparator;
        this.policy = policy;
    }

    async waitForViewport(command) {
        return new Promise((resolve, reject) => {
            const expectedViewport = command.metadata?.viewport;
            
            // If the command doesn't carry viewport metadata, we trivially satisfy.
            if (!expectedViewport) {
                return resolve(new CapabilityResult(Capabilities.VIEWPORT_READY, true, { 
                    latency: 0, 
                    reason: 'No viewport metadata provided' 
                }));
            }

            const startTime = Date.now();
            let timeoutId = null;

            const evaluate = (viewportContext) => {
                const { result, confidence } = this.comparator.compare(expectedViewport, viewportContext);

                if (result === ViewportComparisonResult.MATCH || result === ViewportComparisonResult.TOLERANCE_MATCH) {
                    cleanup();
                    resolve(new CapabilityResult(Capabilities.VIEWPORT_READY, true, {
                        latency: Date.now() - startTime,
                        confidence,
                        matchType: result
                    }));
                    return true;
                }

                if (result === ViewportComparisonResult.WAITING) {
                    return false; // Still waiting
                }

                // Any other result is a mismatch. But wait, if the lifecycle is SYNCING, maybe it's still resizing.
                // We should only fail if we are READY (stable) but still mismatching.
                if (viewportContext && viewportContext.lifecycle === ViewportLifecycle.READY) {
                    cleanup();
                    let errorCode = 'SY-120';
                    let errorMsg = 'Viewport mismatch';

                    switch (result) {
                        case ViewportComparisonResult.WIDTH_MISMATCH:
                        case ViewportComparisonResult.HEIGHT_MISMATCH:
                            errorCode = 'SY-120';
                            errorMsg = `Viewport mismatch (${result})`;
                            break;
                        case ViewportComparisonResult.ORIENTATION_MISMATCH:
                            errorCode = 'SY-121';
                            errorMsg = 'Orientation mismatch';
                            break;
                        case ViewportComparisonResult.DPR_MISMATCH:
                            errorCode = 'SY-122';
                            errorMsg = 'DPR mismatch';
                            break;
                        case ViewportComparisonResult.VISUAL_SCALE_MISMATCH:
                            errorCode = 'SY-125';
                            errorMsg = 'Visual viewport scale mismatch';
                            break;
                    }

                    reject(new Error(`[${errorCode}] ${errorMsg}: expected ${JSON.stringify(expectedViewport)}, got ${JSON.stringify(viewportContext)}`));
                    return true;
                }

                return false;
            };

            const onViewportReady = (event) => {
                if (event.browserId === this.browserId) {
                    try { evaluate(event.viewportContext); } catch (e) { reject(e); }
                }
            };

            const cleanup = () => {
                this.stateMachine.off('ViewportReady', onViewportReady);
                if (timeoutId) clearTimeout(timeoutId);
            };

            // Initial evaluation
            const currentState = BrowserStateRegistry.getState(this.browserId);
            if (currentState && currentState.viewportContext) {
                try {
                    if (evaluate(currentState.viewportContext)) return;
                } catch (e) {
                    return reject(e);
                }
            }

            try {
                // Subscribe to the state machine's ViewportReady event
                this.stateMachine.on('ViewportReady', onViewportReady);

                // Timeout handling
                timeoutId = setTimeout(() => {
                    cleanup();
                    
                    // Read current state to determine the failure reason
                    const latestState = BrowserStateRegistry.getState(this.browserId)?.viewportContext;
                    if (latestState && latestState.lifecycle !== ViewportLifecycle.READY) {
                        reject(new Error(`[SY-123] Viewport synchronization timeout. Lifecycle stuck in ${latestState.lifecycle}`));
                    } else {
                        reject(new Error(`[SY-123] Viewport synchronization timeout. Expected viewport not reached.`));
                    }
                }, this.policy.timeoutMs);
            } catch (e) {
                cleanup();
                reject(e);
            }
        });
    }
}
