import { NavigationEvent, NavigationEventType } from './NavigationEvent.mjs';
import { NavigationStateMachine } from './NavigationStateMachine.mjs';

/**
 * Strictly limits its responsibility to event subscription and normalization.
 */
export class NavigationTracker {
    constructor(browserId, page) {
        this.browserId = browserId;
        this.page = page;
        this.stateMachine = new NavigationStateMachine(browserId);
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
        // In some cases, page.url() might change without explicit framenavigated/load events if intercepted
        // Playwright handles redirects within 'framenavigated' for the most part, but tracking URL changes is safe.
        this._lastUrl = this.page.url();
        this._pollInterval = setInterval(() => {
            if (this.page.isClosed()) {
                clearInterval(this._pollInterval);
                return;
            }
            const currentUrl = this.page.url();
            if (currentUrl !== this._lastUrl) {
                this._lastUrl = currentUrl;
                this._emit(NavigationEventType.URL_CHANGED, currentUrl);
            }
        }, 100);
    }

    _emit(type, url, metadata = {}) {
        const event = new NavigationEvent({
            type,
            browserId: this.browserId,
            url,
            metadata
        });
        
        // Pass event to the state machine
        this.stateMachine.processEvent(event);
    }
}
