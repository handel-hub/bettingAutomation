import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { NavigationLifecycle, NavigationResult } from '../../models/BrowserStateModel.mjs';
import { NavigationEventType } from './NavigationEvent.mjs';

/**
 * Governs transitions through the NavigationLifecycle based on normalized NavigationEvents.
 */
export class NavigationStateMachine {
    constructor(browserId) {
        this.browserId = browserId;
    }

    /**
     * @param {NavigationEvent} event
     */
    processEvent(event) {
        const state = BrowserStateRegistry.getState(this.browserId);
        const ctx = state.navigationContext;

        const updates = {};
        const now = Date.now();

        // 1. Detect if this is the very first navigation event (starting a navigation)
        if (event.type === NavigationEventType.FRAME_NAVIGATED || event.type === NavigationEventType.HISTORY_API || event.type === NavigationEventType.URL_CHANGED) {
            
            // If we are currently navigating, but the URL is changing again, it's a redirect or chained SPA route.
            if (ctx.lifecycle !== NavigationLifecycle.IDLE && ctx.lifecycle !== NavigationLifecycle.READY) {
                if (ctx.currentURL !== event.url) {
                    updates.redirectCount = (ctx.redirectCount || 0) + 1;
                    updates.lifecycle = NavigationLifecycle.REDIRECTING;
                    // If it's a new navigation type, record it
                    if (event.type === NavigationEventType.HISTORY_API) {
                        updates.navigationType = event.metadata.method;
                    } else if (event.type === NavigationEventType.URL_CHANGED && ctx.lifecycle === NavigationLifecycle.REDIRECTING) {
                        updates.navigationType = 'redirect';
                    }
                }
            } else {
                // Fresh navigation start
                updates.previousURL = ctx.currentURL;
                updates.lifecycle = NavigationLifecycle.NAVIGATING;
                updates.result = null;
                updates.redirectCount = 0;
                updates.startedAt = now;
                updates.completedAt = null;
                updates.duration = 0;

                if (event.type === NavigationEventType.HISTORY_API) {
                    updates.navigationType = event.metadata.method;
                } else {
                    updates.navigationType = 'traditional';
                }
            }

            updates.currentURL = event.url;
            
            // Generate a navigation ID if it's a fresh start
            if (updates.lifecycle === NavigationLifecycle.NAVIGATING) {
                const globalNavCounter = (global._navCounter = (global._navCounter || 0) + 1);
                updates.navigationId = `${this.browserId}-nav-${globalNavCounter}`;
            }
            
            BrowserStateRegistry.update(this.browserId, { navigationContext: updates });
            return;
        }

        // 2. Lifecycle progression
        if (ctx.lifecycle === NavigationLifecycle.IDLE || ctx.lifecycle === NavigationLifecycle.READY) {
            // Ignore load/domcontentloaded events if we aren't actively navigating
            return;
        }

        // Advance based on explicit load events
        if (event.type === NavigationEventType.DOM_CONTENT_LOADED) {
            if (ctx.lifecycle === NavigationLifecycle.NAVIGATING || ctx.lifecycle === NavigationLifecycle.REDIRECTING) {
                updates.lifecycle = NavigationLifecycle.WAITING_FOR_LOAD;
            }
        } else if (event.type === NavigationEventType.LOAD) {
            updates.lifecycle = NavigationLifecycle.READY;
            updates.result = NavigationResult.SUCCESS;
            updates.completedAt = now;
            updates.duration = now - (ctx.startedAt || now);
        }

        // SPA (History API) usually finishes instantly from our perspective since it doesn't fire load events
        // However, we wait for URL to settle. The Tracker will emit URL_CHANGED if needed.
        if (event.type === NavigationEventType.HISTORY_API) {
             updates.lifecycle = NavigationLifecycle.READY;
             updates.result = NavigationResult.SUCCESS;
             updates.completedAt = now;
             updates.duration = now - (ctx.startedAt || now);
        }

        if (Object.keys(updates).length > 0) {
            BrowserStateRegistry.update(this.browserId, { navigationContext: updates });
        }
    }

    /**
     * Can be invoked externally if navigation fails or is aborted
     */
    abort(reason) {
        const state = BrowserStateRegistry.getState(this.browserId);
        const ctx = state.navigationContext;
        
        if (ctx.lifecycle !== NavigationLifecycle.READY && ctx.lifecycle !== NavigationLifecycle.IDLE) {
            BrowserStateRegistry.update(this.browserId, {
                navigationContext: {
                    lifecycle: NavigationLifecycle.READY,
                    result: reason,
                    completedAt: Date.now()
                }
            });
        }
    }
}
