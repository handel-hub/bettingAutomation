import { CapabilityProvider } from '../CapabilityProvider.mjs';
import { Capabilities } from '../../capabilities.mjs';
import { ScrollPolicy } from './ScrollPolicy.mjs';
import { ScrollTracker } from './ScrollTracker.mjs';
import { ScrollStateMachine } from './ScrollStateMachine.mjs';
import { ScrollComparator } from './ScrollComparator.mjs';
import { ScrollWaitStrategy } from './ScrollWaitStrategy.mjs';
import { ScrollEvent } from './ScrollEvent.mjs';
import EventEmitter from 'node:events';

/**
 * Ensures scroll coordinates and containers match before interactions execute.
 */
export class ScrollCapabilityProvider extends CapabilityProvider {
    constructor() {
        super();
        this.capability = Capabilities.SCROLL_READY;
        this.policy = new ScrollPolicy();
        this.instances = new Map();
        
        // Forward state machine events as provider events
        this.events = new EventEmitter();
    }

    supportedCapabilities() {
        return [this.capability];
    }

    async initialize(browserId, page) {
        if (!this.instances.has(browserId)) {
            const stateMachine = new ScrollStateMachine(browserId, this.policy);
            const comparator = new ScrollComparator(this.policy);
            const waitStrategy = new ScrollWaitStrategy(browserId, stateMachine, comparator, this.policy);
            const tracker = new ScrollTracker(browserId, page);
            
            tracker.on('ScrollEvent', (eventData) => {
                const scrollEvent = new ScrollEvent(eventData);
                stateMachine.processEvent(scrollEvent);
            });

            this.instances.set(browserId, { tracker, stateMachine, waitStrategy, comparator });

            // Forward state machine events as provider events
            stateMachine.on('ScrollStarted', (e) => this.events.emit('ScrollStarted', e));
            stateMachine.on('ScrollChanged', (e) => this.events.emit('ScrollChanged', e));
            stateMachine.on('ScrollSettling', (e) => this.events.emit('ScrollSettling', e));
            stateMachine.on('ScrollValidated', (e) => this.events.emit('ScrollValidated', e));
            stateMachine.on('ScrollReady', (e) => this.events.emit('ScrollReady', e));

            await tracker.initialize();
        }
    }

    async waitFor(syncContext) {
        const { browserId, context, deadline } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) return;
        return instance.waitStrategy.waitForScroll(context.command, deadline);
    }

    async currentStatus(syncContext) {
        const { browserId } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) return;
        return instance.waitStrategy.waitForScroll({ metadata: {} }, Date.now()); 
    }

    invalidate() {
        // No-op
    }
}
