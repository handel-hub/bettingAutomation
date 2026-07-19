import EventEmitter from 'node:events';
import { ViewportLifecycle } from '../../models/BrowserStateModel.mjs';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { ViewportEventType } from './ViewportEvent.mjs';
import { logger } from '../../../../config.mjs';

/**
 * Consumes ViewportEvents, debounces them via ViewportPolicy,
 * mutates the StateRegistry, and emits normalized Provider Events.
 */
export class ViewportStateMachine extends EventEmitter {
    constructor(browserId, policy) {
        super();
        this.browserId = browserId;
        this.policy = policy;
        
        this.stabilityTimeout = null;
        this.currentLifecycle = ViewportLifecycle.UNKNOWN;
    }

    processEvent(event) {
        const { windowContext, viewportContext } = event.data;
        
        if (this.currentLifecycle === ViewportLifecycle.UNKNOWN || this.currentLifecycle === ViewportLifecycle.READY) {
            this.setLifecycle(ViewportLifecycle.MEASURING);
            this.emit('ViewportResizeStarted', { browserId: this.browserId, timestamp: event.timestamp });
        }

        // Debounce stability window
        if (this.stabilityTimeout) {
            clearTimeout(this.stabilityTimeout);
        }

        // Update registry immediately so telemetry/WaitStrategy can see intermediate states if desired,
        // but mark lifecycle as MEASURING/SYNCING.
        this.updateRegistry(windowContext, viewportContext, ViewportLifecycle.SYNCING);
        this.emit('ViewportChanged', { browserId: this.browserId, windowContext, viewportContext });

        this.stabilityTimeout = setTimeout(() => {
            this.finalizeViewportState(windowContext, viewportContext);
        }, this.policy.stabilityWindowMs);
    }

    finalizeViewportState(windowContext, viewportContext) {
        this.setLifecycle(ViewportLifecycle.VALIDATING);
        this.emit('ViewportResizeCompleted', { browserId: this.browserId });

        // Update registry to VALIDATING. WaitStrategy might sniff this, but we will emit the event explicitly.
        this.updateRegistry(windowContext, viewportContext, ViewportLifecycle.VALIDATING);
        this.emit('ViewportValidated', { browserId: this.browserId, viewportContext });

        // Finally READY
        this.setLifecycle(ViewportLifecycle.READY);
        const finalViewportContext = this.updateRegistry(windowContext, viewportContext, ViewportLifecycle.READY);
        
        // This is the specific event the WaitStrategy listens to
        this.emit('ViewportReady', { browserId: this.browserId, viewportContext: finalViewportContext });
    }

    setLifecycle(state) {
        this.currentLifecycle = state;
    }

    updateRegistry(windowContext, partialViewportContext, lifecycle) {
        const state = BrowserStateRegistry.getState(this.browserId);
        const currentVersion = state.viewportContext?.version || 0;

        const updatedViewportContext = {
            ...partialViewportContext,
            version: currentVersion + 1,
            lifecycle: lifecycle,
            lastResize: Date.now()
        };

        BrowserStateRegistry.update(this.browserId, {
            windowContext,
            viewportContext: updatedViewportContext
        });

        return updatedViewportContext;
    }
}
