import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { Command } from '../execution/Command.mjs';

export class NavigationSynchronizer extends EventEmitter {
    /**
     * @param {BrowserRegistry} registry
     * @param {{ debounceMs?: number }} options
     */
    constructor(registry, options = {}) {
        super();
        this.registry = registry;
        this.debounceMs = options.debounceMs ?? 250;
        this.debounceTimer = null;
        this.latestUrl = null;
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

        await master.page.addInitScript(() => {
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                window.reportHistorySync(location.href);
            };
            window.addEventListener('popstate', () => {
                window.reportHistorySync(location.href);
            });
        });
    }

    /**
     * Coalesces bursts of navigation signals into a single Navigation Command
     * targeting only the last URL seen within the debounce window.
     */
    scheduleSync(url) {
        this.latestUrl = url;
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            this.emit('Command', new Command({
                category: 'Navigation',
                type: 'navigate',
                payload: { url: this.latestUrl },
                source: 'NavigationSynchronizer',
                executionMode: 'SLAVES_ONLY'
            }));
        }, this.debounceMs);
    }
}
