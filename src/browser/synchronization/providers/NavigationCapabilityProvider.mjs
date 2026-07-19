import { Capabilities } from '../capabilities.mjs';
import { CapabilityProvider } from './CapabilityProvider.mjs';
import { NavigationTracker } from './navigation/NavigationTracker.mjs';
import { NavigationWaitStrategy } from './navigation/NavigationWaitStrategy.mjs';
import { BrowserStateRegistry } from '../BrowserStateRegistry.mjs';
import EventEmitter from 'node:events';
import { NavigationLifecycle, NavigationResult } from '../models/BrowserStateModel.mjs';

/**
 * Ensures the browser has completed any navigations or redirects and the URL matches the expected target.
 */
export class NavigationCapabilityProvider extends CapabilityProvider {
    constructor() {
        super();
        this.events = new EventEmitter();
        this.initializedPages = new WeakMap(); // page -> true
        
        // Listen to registry to emit provider-level events
        BrowserStateRegistry.on('StateUpdated', ({ browserId, state }) => {
            const ctx = state.navigationContext;
            if (!ctx) return;
            
            const prev = this._previousStates?.[browserId] || {};
            if (prev.lifecycle !== ctx.lifecycle) {
                switch(ctx.lifecycle) {
                    case NavigationLifecycle.NAVIGATING:
                        this.events.emit('navigationStarted', { browserId, url: ctx.currentURL });
                        break;
                    case NavigationLifecycle.REDIRECTING:
                        this.events.emit('navigationRedirected', { browserId, url: ctx.currentURL });
                        break;
                    case NavigationLifecycle.READY:
                        if (ctx.result === NavigationResult.SUCCESS) {
                            this.events.emit('navigationReady', { browserId, url: ctx.currentURL });
                            this.events.emit('navigationSettled', { browserId, url: ctx.currentURL });
                        } else if (ctx.result === NavigationResult.CANCELLED) {
                            this.events.emit('navigationCancelled', { browserId, url: ctx.currentURL });
                            this.events.emit('navigationFailed', '[SY-113] Navigation cancelled');
                        } else {
                            this.events.emit('navigationFailed', '[SY-101] Navigation failed');
                        }
                        break;
                }
            }
            
            if (!this._previousStates) this._previousStates = {};
            this._previousStates[browserId] = { ...ctx };
        });
    }

    supportedCapabilities() {
        return [Capabilities.NAVIGATION_READY];
    }

    async initialize(browserId, page) {
        if (this.initializedPages.has(page)) return;
        this.initializedPages.set(page, true);

        const tracker = new NavigationTracker(browserId, page);
        await tracker.initialize();
    }

    async waitFor(syncContext) {
        const { browserId } = syncContext;
        const waitStrategy = new NavigationWaitStrategy(browserId, this.events);
        return await waitStrategy.waitFor(syncContext);
    }

    async currentStatus(syncContext) {
        const { browserId } = syncContext;
        const state = BrowserStateRegistry.getState(browserId);
        const ctx = state.navigationContext;
        
        const isSatisfied = ctx.lifecycle === NavigationLifecycle.READY || ctx.lifecycle === NavigationLifecycle.IDLE;
        return {
            satisfied: isSatisfied,
            capability: Capabilities.NAVIGATION_READY,
            latency: 0,
            error: null
        };
    }

    invalidate(syncContext) {
        // Handled via NavigationStateMachine abort()
    }
}
