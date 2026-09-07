import { logger } from '../../utils/logger.mjs';
import EventEmitter from 'node:events';
import { Command } from '../execution/Command.mjs';

export class NavigationSynchronizer extends EventEmitter {
    constructor(registry, actionDispatcher) {
        super();
        this.registry = registry;
        this.actionDispatcher = actionDispatcher;
    }

    async setupMasterSync() {
        const master = this.registry.getMaster();
        if (!master) return;

        master.page.on('framenavigated', (frame) => {
            if (frame === master.page.mainFrame()) {
                const newUrl = frame.url();
                logger.info(`[Master Navigated] ${newUrl}`);
                this.registry.updateUrl(master.id, newUrl);
            }
        });

        await master.page.exposeBinding('reportNavigationSync', ({ source }, payload) => {
            if (source.frame === master.page.mainFrame()) {
                logger.info(`[NavigationSynchronizer] Captured page_initiated navigation to ${payload.url} via ${payload.navType}`);
                this.registry.updateUrl(master.id, payload.url);
            } else {
                logger.warn(`[Security] Rejected reportNavigationSync from cross-origin or child iframe: ${payload.url}`);
            }
        });

        const syncScript = `
            if (window.navigation) {
                window.navigation.addEventListener('navigate', (event) => {
                    if (window.reportNavigationSync) {
                        window.reportNavigationSync({
                            url: event.destination.url,
                            navType: event.navigationType // 'push', 'replace', 'reload', 'traverse'
                        });
                    }
                });
            }
        `;
        
        await master.page.addInitScript(syncScript);
        await master.page.evaluate(syncScript).catch(err => logger.warn('Failed to immediately evaluate NavigationSynchronizer script: ' + err.message));
    }
}
