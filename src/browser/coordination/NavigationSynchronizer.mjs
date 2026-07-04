import { logger } from '../../config.mjs';

export class NavigationSynchronizer {
    constructor(registry) {
        this.registry = registry;
    }

    async setupMasterSync() {
        const master = this.registry.getMaster();
        if (!master) return;

        master.page.on('framenavigated', async (frame) => {
            if (frame === master.page.mainFrame()) {
                const newUrl = frame.url();
                logger.info(`[Master Navigated] ${newUrl}`);
                this.registry.updateUrl(master.id, newUrl);
                await this.syncSlavesTo(newUrl);
            }
        });
        
        await master.page.exposeFunction('reportHistorySync', async (url) => {
            logger.info(`[Master History Push] ${url}`);
            this.registry.updateUrl(master.id, url);
            await this.syncSlavesTo(url);
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

    async syncSlavesTo(url) {
        const slaves = this.registry.getAll().filter(b => b.role === 'slave');
        logger.info(`Synchronizing ${slaves.length} slaves to ${url}`);
        
        const promises = slaves.map(async (slave) => {
            try {
                this.registry.updateState(slave.id, 'Busy');
                await slave.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                this.registry.updateUrl(slave.id, url);
                this.registry.updateState(slave.id, 'Ready');
            } catch (err) {
                logger.error(`Slave [${slave.id}] failed to sync to ${url}: ${err.message}`);
                this.registry.updateState(slave.id, 'Error');
            }
        });

        await Promise.allSettled(promises);
    }
}
