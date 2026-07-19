import { CapabilityResult } from '../../models/CapabilityResult.mjs';
import { Capabilities } from '../../capabilities.mjs';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';

export class FrameWaitStrategy {
    constructor(browserId, stateMachine, comparator, policy) {
        this.browserId = browserId;
        this.stateMachine = stateMachine;
        this.comparator = comparator;
        this.policy = policy;
    }

    async waitForContext(context) {
        const metadata = context.metadata || context; // Depending on how syncContext is structured
        if (!metadata || !metadata.executionContext) {
            return new CapabilityResult(Capabilities.FRAME_READY, true);
        }

        return new Promise((resolve) => {
            const check = () => {
                const state = BrowserStateRegistry.getState(this.browserId);
                const result = this.comparator.compare(metadata, state);
                
                if (result.match) {
                    cleanup();
                    resolve(new CapabilityResult(Capabilities.FRAME_READY, true));
                    return true;
                } else if (result.code !== 'WAITING') {
                    cleanup();
                    resolve(new CapabilityResult(Capabilities.FRAME_READY, false, {
                        reason: result.reason,
                        code: result.code
                    }));
                    return true;
                }
                return false;
            };

            const onReady = () => check();

            const timeout = setTimeout(() => {
                cleanup();
                resolve(new CapabilityResult(Capabilities.FRAME_READY, false, {
                    reason: 'Execution context synchronization timeout',
                    code: 'SY-142'
                }));
            }, this.policy.frameTimeout);

            const cleanup = () => {
                clearTimeout(timeout);
                this.stateMachine.off('ExecutionContextReady', onReady);
            };

            this.stateMachine.on('ExecutionContextReady', onReady);
            
            check();
        });
    }
}
