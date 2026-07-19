import EventEmitter from 'node:events';
import { ScrollLifecycle } from '../../models/BrowserStateModel.mjs';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { logger } from '../../../../config.mjs';

/**
 * Consumes ScrollEvents, debounces them via ScrollPolicy,
 * mutates the StateRegistry, and emits normalized Provider Events.
 */
export class ScrollStateMachine extends EventEmitter {
    constructor(browserId, policy) {
        super();
        this.browserId = browserId;
        this.policy = policy;
        
        this.stabilityTimeout = null;
        this.virtualizationTimeout = null;
        this.currentLifecycle = ScrollLifecycle.UNKNOWN;
        
        this.lastEventData = null;
    }

    processEvent(event) {
        this.lastEventData = event;

        if (this.currentLifecycle === ScrollLifecycle.UNKNOWN || this.currentLifecycle === ScrollLifecycle.READY || this.currentLifecycle === ScrollLifecycle.IDLE) {
            this.setLifecycle(ScrollLifecycle.SCROLLING);
            this.emit('ScrollStarted', { browserId: this.browserId, timestamp: event.timestamp });
        }

        // Clear existing timeouts
        if (this.stabilityTimeout) clearTimeout(this.stabilityTimeout);
        if (this.virtualizationTimeout) clearTimeout(this.virtualizationTimeout);

        const isSettling = event.velocity <= this.policy.velocityThreshold || event.isScrollEnd;

        this.updateRegistry(event, isSettling ? ScrollLifecycle.SETTLING : ScrollLifecycle.SCROLLING);
        this.emit('ScrollChanged', { browserId: this.browserId, scrollContext: this.lastEventData });

        if (isSettling) {
            this.setLifecycle(ScrollLifecycle.SETTLING);
            this.stabilityTimeout = setTimeout(() => {
                this.enterWaitingForContent();
            }, this.policy.stabilityWindowMs);
        } else {
            // Still in motion, checking momentum timeout could be done here if needed
            this.setLifecycle(ScrollLifecycle.SCROLLING);
        }
    }

    enterWaitingForContent() {
        this.setLifecycle(ScrollLifecycle.WAITING_FOR_CONTENT);
        this.emit('ScrollSettling', { browserId: this.browserId });
        this.updateRegistry(this.lastEventData, ScrollLifecycle.WAITING_FOR_CONTENT);

        this.virtualizationTimeout = setTimeout(() => {
            this.finalizeScrollState();
        }, this.policy.virtualizationTimeoutMs);
    }

    finalizeScrollState() {
        this.setLifecycle(ScrollLifecycle.VALIDATING);
        this.updateRegistry(this.lastEventData, ScrollLifecycle.VALIDATING);
        this.emit('ScrollValidated', { browserId: this.browserId });

        this.setLifecycle(ScrollLifecycle.READY);
        const finalContext = this.updateRegistry(this.lastEventData, ScrollLifecycle.READY);
        
        this.emit('ScrollReady', { browserId: this.browserId, scrollContext: finalContext });
    }

    setLifecycle(state) {
        this.currentLifecycle = state;
    }

    updateRegistry(eventData, lifecycle) {
        const state = BrowserStateRegistry.getState(this.browserId);
        const currentVersion = state.scrollContext?.version || 0;

        const updatedScrollContext = {
            version: currentVersion + 1,
            lifecycle: lifecycle,
            source: eventData.source,
            scrollId: eventData.scrollId || null,
            pageScrollX: eventData.pageScrollX,
            pageScrollY: eventData.pageScrollY,
            activeContainerId: eventData.activeContainerId,
            containerScrollX: eventData.containerScrollX,
            containerScrollY: eventData.containerScrollY,
            direction: eventData.direction,
            velocity: eventData.velocity,
            lastScrollTime: eventData.timestamp
        };

        BrowserStateRegistry.update(this.browserId, {
            scrollContext: updatedScrollContext
        });

        return updatedScrollContext;
    }
}
