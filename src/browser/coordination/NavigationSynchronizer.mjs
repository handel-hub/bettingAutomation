import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { Command } from '../execution/Command.mjs';

export class NavigationSynchronizer extends EventEmitter {
    constructor(registry, actionDispatcher) {
        super();
        this.registry = registry;
        this.actionDispatcher = actionDispatcher;
        this.lastPageInitiatedUrl = null;
        this.lastPageInitiatedTime = 0;
        
        // SPEC-02: Suppressed navigation metrics
        this.suppressionMetrics = {
            count: 0,
            windowStart: Date.now()
        };
    }

    async setupMasterSync() {
        const master = this.registry.getMaster();
        if (!master) return;

        master.page.on('framenavigated', (frame) => {
            if (frame === master.page.mainFrame()) {
                const newUrl = frame.url();
                logger.info(`[Master Navigated] ${newUrl}`);
                this.registry.updateUrl(master.id, newUrl);
                
                // If we just saw a page_initiated navigation for this exact URL, don't emit it again as browser_initiated
                if (newUrl === this.lastPageInitiatedUrl && (Date.now() - this.lastPageInitiatedTime) < 500) {
                    return; // Already captured by window.navigation
                }
                
                this.emitNavigation(newUrl, 'browser_initiated', 'external');
            }
        });

        await master.page.exposeBinding('reportNavigationSync', ({ source }, payload) => {
            if (source.frame === master.page.mainFrame()) {
                logger.info(`[NavigationSynchronizer] Captured page_initiated navigation to ${payload.url} via ${payload.navType}`);
                this.registry.updateUrl(master.id, payload.url);
                this.lastPageInitiatedUrl = payload.url;
                this.lastPageInitiatedTime = Date.now();
                this.emitNavigation(payload.url, 'page_initiated', payload.navType);
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

    emitNavigation(url, causality, navType) {
        const now = Date.now();
        
        // SPEC-02: Deduplicate non-SPA navigations triggered by CLICK commands
        if (this.actionDispatcher && causality === 'page_initiated' && (navType === 'push' || navType === 'replace')) {
            const lastClick = this.actionDispatcher.getLastClickEmitTime();
            if (now - lastClick < 200) {
                // Task 1.5: Rate tracking
                if (now - this.suppressionMetrics.windowStart > 60000) {
                    logger.info(`[NavigationSynchronizer] Suppressed ${this.suppressionMetrics.count} duplicate navigations in the last minute.`);
                    this.suppressionMetrics.count = 1;
                    this.suppressionMetrics.windowStart = now;
                } else {
                    this.suppressionMetrics.count++;
                }
                logger.info(`[NavigationSynchronizer] Dropping duplicate navigation to ${url}. Deduped against recent CLICK.`);
                return;
            }
        }

        this.emit('Command', new Command({
            category: 'Navigation',
            type: 'navigate',
            payload: { url, captureTime: now, causality, navType },
            source: 'NavigationSynchronizer',
            ges: null // Navigations bypass GES validation and execute immediately, stalling SequenceGate via DOM state
        }));
    }
}
