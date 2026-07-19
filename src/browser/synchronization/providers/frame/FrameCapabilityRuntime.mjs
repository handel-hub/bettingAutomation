import { BaseCapabilityRuntime } from '../BaseCapabilityRuntime.mjs';
import { ExecutionContextPolicy } from './ExecutionContextPolicy.mjs';
import { FrameTracker } from './FrameTracker.mjs';
import { ShadowTracker } from './ShadowTracker.mjs';
import { FrameStateMachine } from './FrameStateMachine.mjs';
import { ExecutionContextComparator } from './ExecutionContextComparator.mjs';
import { FrameWaitStrategy } from './FrameWaitStrategy.mjs';

export class FrameCapabilityRuntime extends BaseCapabilityRuntime {
    constructor(browserId) {
        super(browserId);
        
        const policy = new ExecutionContextPolicy();
        this.setPolicy(policy);

        const frameTracker = new FrameTracker(browserId);
        const shadowTracker = new ShadowTracker(browserId);
        
        const stateMachine = new FrameStateMachine(browserId, policy);
        this.setStateMachine(stateMachine);

        frameTracker.setStateMachine(stateMachine);
        shadowTracker.setStateMachine(stateMachine);

        this.registerTracker(frameTracker);
        this.registerTracker(shadowTracker);

        const comparator = new ExecutionContextComparator(policy);
        this.setComparator(comparator);

        const waitStrategy = new FrameWaitStrategy(browserId, stateMachine, comparator, policy);
        this.setWaitStrategy(waitStrategy);

        this.forwardEvent('FrameAttached');
        this.forwardEvent('FrameDetached');
        this.forwardEvent('FrameNavigated');
        this.forwardEvent('ShadowAttached');
        // this.forwardEvent('ShadowDetached'); // Add back when ShadowTracker supports it
        this.forwardEvent('ExecutionContextValidated');
        this.forwardEvent('ExecutionContextReady');
    }
}
