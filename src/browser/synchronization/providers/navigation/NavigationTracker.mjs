import { NavigationEvent, NavigationEventType } from './NavigationEvent.mjs';
import { NavigationStateMachine } from './NavigationStateMachine.mjs';

import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';

/**
 * Strictly limits its responsibility to event subscription and normalization.
 */
export class NavigationTracker {
    constructor(browserId, page) {
        this.browserId = browserId;
        this.page = page;
        this.stateMachine = new NavigationStateMachine(browserId);
        this._lastUrl = null;
        this._lastNavigationId = null;
    }

    async initialize() {
        // 1. Playwright Events
        this.page.on('framenavigated', (frame) => {
            if (frame === this.page.mainFrame()) {
                this._emit(NavigationEventType.FRAME_NAVIGATED, frame.url());
            }
        });

        this.page.on('domcontentloaded', () => {
            this._emit(NavigationEventType.DOM_CONTENT_LOADED, this.page.url());
        });

        this.page.on('load', () => {
            this._emit(NavigationEventType.LOAD, this.page.url());
        });

        // 2. History API Injection
        await this.page.exposeFunction('__notifyHistoryApi', (method, url) => {
            this._emit(NavigationEventType.HISTORY_API, url || this.page.url(), { method });
        });

        const historyProxyScript = `
            (() => {
                const notify = (method) => {
                    if (window.__notifyHistoryApi) {
                        window.__notifyHistoryApi(method, window.location.href);
                    }
                };

                const originalPushState = history.pushState;
                history.pushState = function(...args) {
                    const result = originalPushState.apply(this, args);
                    notify('pushState');
                    return result;
                };

                const originalReplaceState = history.replaceState;
                history.replaceState = function(...args) {
                    const result = originalReplaceState.apply(this, args);
                    notify('replaceState');
                    return result;
                };

                window.addEventListener('popstate', () => notify('popstate'));
                window.addEventListener('hashchange', () => notify('hashchange'));

                const originalGo = history.go;
                history.go = function(...args) {
                    const result = originalGo.apply(this, args);
                    notify('go');
                    return result;
                };

                const originalBack = history.back;
                history.back = function(...args) {
                    const result = originalBack.apply(this, args);
                    notify('back');
                    return result;
                };

                const originalForward = history.forward;
                history.forward = function(...args) {
                    const result = originalForward.apply(this, args);
                    notify('forward');
                    return result;
                };
            })();
        `;
        
        await this.page.addInitScript(historyProxyScript).catch(() => {});
        
        // 3. Rapid URL Change Polling to catch unexposed redirects natively
        this._lastUrl = this.page.url();
        this._pollInterval = setInterval(() => {
            if (this.page.isClosed()) {
                clearInterval(this._pollInterval);
                return;
            }
            const currentUrl = this.page.url();
            if (currentUrl !== this._lastUrl) {
                // Check if this URL change belongs to an already active navigation that we missed
                const state = BrowserStateRegistry.getState(this.browserId);
                const ctx = state?.navigationContext || {};
                
                if (ctx.lifecycle && ctx.lifecycle !== 'IDLE' && ctx.lifecycle !== 'READY' && ctx.currentURL === currentUrl) {
                    // It belongs to the active navigation but we missed the native event
                    // Suppress duplicate event emission
                    this._lastUrl = currentUrl;
                    return;
                }

                this._emit(NavigationEventType.URL_CHANGED, currentUrl);
            }
        }, 100);
    }

    _emit(type, url, metadata = {}) {
        const state = BrowserStateRegistry.getState(this.browserId);
        const ctx = state?.navigationContext || {};
        const isIdleOrReady = !ctx.lifecycle || ctx.lifecycle === 'IDLE' || ctx.lifecycle === 'READY';
        
        let navId = ctx.navigationId;
        
        // Identity Generation: Tracker is the source of truth for new navigation IDs
        if (type === NavigationEventType.FRAME_NAVIGATED || type === NavigationEventType.HISTORY_API || type === NavigationEventType.URL_CHANGED) {
            if (isIdleOrReady) {
                global._navCounter = (global._navCounter || 0) + 1;
                navId = `${this.browserId}-nav-${global._navCounter}`;
            }
        }

        // Invariant enforced: _lastUrl and _lastNavigationId must reflect the last emitted event
        this._lastUrl = url;
        this._lastNavigationId = navId;

        const event = new NavigationEvent({
            type,
            browserId: this.browserId,
            url,
            navigationId: navId,
            metadata
        });
        
        // Pass event to the state machine
        this.stateMachine.processEvent(event);
    }
}
