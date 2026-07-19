import EventEmitter from 'node:events';

/**
 * Base abstract class encapsulating the generic Tracker -> StateMachine -> WaitStrategy lifecycle
 * for synchronization capability providers.
 */
export class BaseCapabilityRuntime {
    constructor(browserId) {
        this.browserId = browserId;
        this.events = new EventEmitter();
        
        this.trackers = [];
        this.stateMachine = null;
        this.waitStrategy = null;
        this.comparator = null;
        this.policy = null;
    }

    registerTracker(tracker) {
        this.trackers.push(tracker);
    }

    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }

    setWaitStrategy(waitStrategy) {
        this.waitStrategy = waitStrategy;
    }

    setComparator(comparator) {
        this.comparator = comparator;
    }

    setPolicy(policy) {
        this.policy = policy;
    }

    forwardEvent(eventName) {
        if (!this.stateMachine) {
            throw new Error('StateMachine must be set before forwarding events.');
        }
        this.stateMachine.on(eventName, (e) => this.events.emit(eventName, e));
    }

    async initialize(page) {
        for (const tracker of this.trackers) {
            if (typeof tracker.initialize === 'function') {
                await tracker.initialize(page);
            }
        }
    }

    async attach(page) {
        for (const tracker of this.trackers) {
            if (typeof tracker.attach === 'function') {
                await tracker.attach(page);
            }
        }
    }

    async detach() {
        for (const tracker of this.trackers) {
            if (typeof tracker.detach === 'function') {
                await tracker.detach();
            }
        }
    }

    dispose() {
        this.detach();
        this.events.removeAllListeners();
    }
    
    // Listeners for the provider to consume
    on(event, listener) {
        this.events.on(event, listener);
    }
    
    off(event, listener) {
        this.events.off(event, listener);
    }
}
