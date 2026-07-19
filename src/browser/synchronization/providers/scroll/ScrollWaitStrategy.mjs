import { Capabilities } from '../../capabilities.mjs';
import { ScrollComparisonResult } from './ScrollComparator.mjs';
import { CapabilityResult } from '../../models/CapabilityResult.mjs';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { ScrollLifecycle } from '../../models/BrowserStateModel.mjs';

/**
 * Handles concurrent evaluation of Scroll readiness by evaluating
 * metadata against current runtime ScrollContext and reacting to ScrollReady events.
 */
export class ScrollWaitStrategy {
    constructor(browserId, stateMachine, comparator, policy) {
        this.browserId = browserId;
        this.stateMachine = stateMachine;
        this.comparator = comparator;
        this.policy = policy;
    }

    async waitForScroll(command, deadline) {
        return new Promise((resolve, reject) => {
            const expectedScroll = command.metadata?.scroll;
            
            if (!expectedScroll) {
                return resolve(new CapabilityResult(Capabilities.SCROLL_READY, true, { 
                    latency: 0, 
                    reason: 'No scroll metadata provided' 
                }));
            }

            const startTime = Date.now();
            let timeoutId = null;

            const evaluate = (scrollContext) => {
                const { result, confidence } = this.comparator.compare(expectedScroll, scrollContext);

                if (result === ScrollComparisonResult.MATCH || result === ScrollComparisonResult.TOLERANCE_MATCH) {
                    cleanup();
                    resolve(new CapabilityResult(Capabilities.SCROLL_READY, true, {
                        latency: Date.now() - startTime,
                        confidence,
                        matchType: result
                    }));
                    return true;
                }

                if (result === ScrollComparisonResult.WAITING || 
                    result === ScrollComparisonResult.MOMENTUM_ACTIVE ||
                    result === ScrollComparisonResult.VIRTUALIZATION_PENDING) {
                    return false; // Still waiting
                }

                // Any other result is a mismatch. We only fail if lifecycle is READY/IDLE (stable).
                if (scrollContext && (scrollContext.lifecycle === ScrollLifecycle.READY || scrollContext.lifecycle === ScrollLifecycle.IDLE)) {
                    cleanup();
                    let errorCode = 'SY-136'; // Scroll divergence
                    let errorMsg = 'Scroll mismatch';

                    switch (result) {
                        case ScrollComparisonResult.WINDOW_POSITION_MISMATCH:
                            errorCode = 'SY-130';
                            errorMsg = 'Window scroll mismatch';
                            break;
                        case ScrollComparisonResult.CONTAINER_POSITION_MISMATCH:
                        case ScrollComparisonResult.CONTAINER_ID_MISMATCH:
                            errorCode = 'SY-131';
                            errorMsg = 'Container mismatch';
                            break;
                    }

                    reject(new Error(`[${errorCode}] ${errorMsg}: expected ${JSON.stringify(expectedScroll)}, got ${JSON.stringify(scrollContext)}`));
                    return true;
                }

                return false;
            };

            const onScrollReady = (event) => {
                if (event.browserId === this.browserId) {
                    try { evaluate(event.scrollContext); } catch (e) { reject(e); }
                }
            };

            const cleanup = () => {
                this.stateMachine.off('ScrollReady', onScrollReady);
                if (timeoutId) clearTimeout(timeoutId);
            };

            // Initial evaluation
            const currentState = BrowserStateRegistry.getState(this.browserId);
            if (currentState && currentState.scrollContext) {
                try {
                    if (evaluate(currentState.scrollContext)) return;
                } catch (e) {
                    return reject(e);
                }
            }

            try {
                this.stateMachine.on('ScrollReady', onScrollReady);

                const timeoutMs = Math.max(0, deadline - Date.now());

                timeoutId = setTimeout(() => {
                    cleanup();
                    
                    const latestState = BrowserStateRegistry.getState(this.browserId)?.scrollContext;
                    if (latestState) {
                        if (latestState.lifecycle === ScrollLifecycle.SCROLLING || latestState.lifecycle === ScrollLifecycle.SETTLING) {
                            if (latestState.velocity > this.policy.velocityThreshold) {
                                reject(new Error(`[SY-133] Momentum timeout. Still scrolling.`));
                            } else {
                                reject(new Error(`[SY-132] Scroll timeout. Still scrolling/settling.`));
                            }
                        } else if (latestState.lifecycle === ScrollLifecycle.WAITING_FOR_CONTENT) {
                            reject(new Error(`[SY-134] Virtualization timeout. Stuck waiting for content.`));
                        } else {
                            reject(new Error(`[SY-132] Scroll timeout. Expected scroll not reached.`));
                        }
                    } else {
                        reject(new Error(`[SY-132] Scroll timeout. Expected scroll not reached.`));
                    }
                }, timeoutMs);
            } catch (e) {
                cleanup();
                reject(e);
            }
        });
    }
}
