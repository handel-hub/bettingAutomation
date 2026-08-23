import EventEmitter from 'node:events';
import { ScrollLifecycle } from '../../models/BrowserStateModel.mjs';
import { logger } from '../../../../config.mjs';

/**
 * Consumes ScrollEvents, debounces them via ScrollPolicy,
 * mutates the StateRegistry, and emits normalized Provider Events.
 */
export class ScrollStateMachine extends EventEmitter {
    constructor(browserId, registry, policy) {
        super();
        this.browserId = browserId;
        this.registry = registry;
        this.policy = policy;
        this.containers = new Map();
    }

    getContainerState(containerId) {
        if (!this.containers.has(containerId)) {
            this.containers.set(containerId, {
                stabilityTimeout: null,
                virtualizationTimeout: null,
                currentLifecycle: ScrollLifecycle.UNKNOWN,
                lastEventData: null
            });
        }
        return this.containers.get(containerId);
    }

    invalidate(containerId = 'window') {
        const cState = this.getContainerState(containerId);
        cState.currentLifecycle = ScrollLifecycle.UNKNOWN;
        
        if (cState.stabilityTimeout) clearTimeout(cState.stabilityTimeout);
        if (cState.virtualizationTimeout) clearTimeout(cState.virtualizationTimeout);
        
        this.updateRegistry(containerId, cState.lastEventData || {}, ScrollLifecycle.UNKNOWN);
        this.emit('ScrollChanged', { browserId: this.browserId, containerId, scrollContext: cState.lastEventData });
    }

    processEvent(event) {
        const containerId = event.activeContainerId || 'window';
        const cState = this.getContainerState(containerId);
        cState.lastEventData = event;

        if (cState.currentLifecycle === ScrollLifecycle.UNKNOWN || cState.currentLifecycle === ScrollLifecycle.READY || cState.currentLifecycle === ScrollLifecycle.IDLE) {
            cState.currentLifecycle = ScrollLifecycle.SCROLLING;
            this.emit('ScrollStarted', { browserId: this.browserId, containerId, timestamp: event.timestamp });
        }

        if (cState.stabilityTimeout) clearTimeout(cState.stabilityTimeout);
        if (cState.virtualizationTimeout) clearTimeout(cState.virtualizationTimeout);

        const isSettling = event.velocity <= this.policy.velocityThreshold || event.isScrollEnd;

        this.updateRegistry(containerId, event, isSettling ? ScrollLifecycle.SETTLING : ScrollLifecycle.SCROLLING);
        this.emit('ScrollChanged', { browserId: this.browserId, containerId, scrollContext: cState.lastEventData });

        if (isSettling) {
            cState.currentLifecycle = ScrollLifecycle.SETTLING;
            cState.stabilityTimeout = setTimeout(() => {
                this.enterWaitingForContent(containerId);
            }, this.policy.stabilityWindowMs);
        } else {
            cState.currentLifecycle = ScrollLifecycle.SCROLLING;
        }
    }

    enterWaitingForContent(containerId) {
        const cState = this.getContainerState(containerId);
        cState.currentLifecycle = ScrollLifecycle.WAITING_FOR_CONTENT;
        this.emit('ScrollSettling', { browserId: this.browserId, containerId });
        this.updateRegistry(containerId, cState.lastEventData, ScrollLifecycle.WAITING_FOR_CONTENT);

        cState.virtualizationTimeout = setTimeout(() => {
            this.finalizeScrollState(containerId);
        }, this.policy.virtualizationTimeoutMs);
    }

    finalizeScrollState(containerId) {
        const cState = this.getContainerState(containerId);
        cState.currentLifecycle = ScrollLifecycle.VALIDATING;
        this.updateRegistry(containerId, cState.lastEventData, ScrollLifecycle.VALIDATING);
        this.emit('ScrollValidated', { browserId: this.browserId, containerId });

        cState.currentLifecycle = ScrollLifecycle.READY;
        const finalContext = this.updateRegistry(containerId, cState.lastEventData, ScrollLifecycle.READY);
        
        this.emit('ScrollReady', { browserId: this.browserId, containerId, scrollContext: finalContext });
    }

    updateRegistry(containerId, eventData, lifecycle) {
        const state = this.registry.getState(this.browserId);
        const existingCtx = state.scrollContexts ? state.scrollContexts.get(containerId) : null;
        const currentVersion = existingCtx ? existingCtx.version : 0;

        const updatedScrollContext = {
            version: currentVersion + 1,
            lifecycle: lifecycle,
            source: eventData.source,
            scrollId: eventData.scrollId || null,
            pageScrollX: eventData.pageScrollX,
            pageScrollY: eventData.pageScrollY,
            activeContainerId: containerId,
            containerScrollX: eventData.containerScrollX,
            containerScrollY: eventData.containerScrollY,
            rhoX: eventData.rhoX,
            rhoY: eventData.rhoY,
            direction: eventData.direction,
            velocity: eventData.velocity,
            lastScrollTime: eventData.timestamp
        };

        this.registry.update(this.browserId, {
            scrollContext: updatedScrollContext
        });

        return updatedScrollContext;
    }
}
