import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { Command } from '../execution/Command.mjs';

export class NavigationSynchronizer extends EventEmitter {
    /**
     * @param {BrowserRegistry} registry
     * @param {{ dedupeWindowMs?: number }} options
     */
    constructor(registry, options = {}) {
        super();
        this.registry = registry;
        // A single logical navigation can report twice - Playwright's own
        // 'framenavigated' fires for same-document (SPA) navigations too,
        // and the patched pushState/popstate handler reports the same URL
        // independently. This window only suppresses an exact-URL repeat
        // arriving right after the first; it does not merge or drop
        // genuinely different URLs - every distinct navigation is emitted
        // as its own Command, in the order it happened.
        this.dedupeWindowMs = options.dedupeWindowMs ?? 250;
        this.lastQueuedUrl = null;
        this.lastQueuedAt = 0;
    }

    async setupMasterSync() {
        const master = this.registry.getMaster();
        if (!master) return;

        master.page.on('framenavigated', (frame) => {
            if (frame === master.page.mainFrame()) {
                const newUrl = frame.url();
                logger.info(`[Master Navigated] ${newUrl}`);
                this.registry.updateUrl(master.id, newUrl);
                this.scheduleSync(newUrl);
            }
        });

        await master.page.exposeFunction('reportHistorySync', (url) => {
            logger.info(`[Master History Push] ${url}`);
            this.registry.updateUrl(master.id, url);
            this.scheduleSync(url);
        });

        const syncScript = `
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                if (window.reportHistorySync) window.reportHistorySync(location.href);
            };
            window.addEventListener('popstate', () => {
                if (window.reportHistorySync) window.reportHistorySync(location.href);
            });
        `;
        
        await master.page.addInitScript(syncScript);
        await master.page.evaluate(syncScript).catch(err => logger.warn('Failed to immediately evaluate NavigationSynchronizer script: ' + err.message));
    }

    /**
     * Emits a Navigation Command for every distinct URL, in the order it
     * was seen. Only suppresses an exact repeat of the immediately prior
     * URL within dedupeWindowMs (the two-signals-one-navigation case) -
     * it never collapses a sequence of different URLs down to the latest.
     */
    scheduleSync(url) {
        const now = Date.now();
        if (url === this.lastQueuedUrl && (now - this.lastQueuedAt) < this.dedupeWindowMs) {
            return;
        }
        this.lastQueuedUrl = url;
        this.lastQueuedAt = now;

        this.emit('Command', new Command({
            category: 'Navigation',
            type: 'navigate',
            payload: { url, captureTime: now },
            source: 'NavigationSynchronizer'
        }));
    }
}
