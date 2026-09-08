import EventEmitter from 'node:events';
import { logger } from '../../utils/logger.mjs';

export class StateObserver extends EventEmitter {
    constructor(registry) {
        super();
        this.registry = registry;
    }

    async injectObservers(nodeId, page) {
        try {
            await page.exposeBinding('__stateObserverReport', ({ source }, payload) => {
                const observation = {
                    nodeId,
                    url: payload.url,
                    domHash: payload.domHash,
                    causingCommandId: payload.causingCommandId || null,
                    timestamp: payload.timestamp
                };
                this.emit('StateObservation', observation);
            });
        } catch (err) {
            if (!err.message.includes('has been already exposed')) {
                logger.warn(`Failed to expose __stateObserverReport on ${nodeId}: ${err.message}`);
            }
        }

        const observerScript = `
            (() => {
                if (window.__stateObserverInjected) return;
                window.__stateObserverInjected = true;

                function computeDomHash() {
                    const elements = document.querySelectorAll('*');
                    const tags = Array.prototype.map.call(elements, el => el.tagName).join('');
                    let hash = 0;
                    for (let i = 0; i < tags.length; i++) {
                        const char = tags.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    return hash.toString(16);
                }

                function reportState(causingCommandId = null) {
                    if (window.__stateObserverReport) {
                        const hlc = window.__lastHlc || { physical: Date.now(), logical: 0 };
                        window.__stateObserverReport({
                            url: location.href,
                            domHash: computeDomHash(),
                            causingCommandId: causingCommandId,
                            timestamp: { physical: hlc.physical, logical: hlc.logical }
                        }).catch(() => {});
                    }
                }

                // Monkey-patch History API
                const _origPush = history.pushState;
                const _origReplace = history.replaceState;
                
                history.pushState = function(...args) {
                    _origPush.apply(this, args);
                    reportState();
                };
                
                history.replaceState = function(...args) {
                    _origReplace.apply(this, args);
                    reportState();
                };
                
                window.addEventListener('popstate', function() {
                    reportState();
                });
            })();
        `;
        
        await page.addInitScript(observerScript);
        await page.evaluate(observerScript).catch(err => logger.warn('Failed to evaluate StateObserver script: ' + err.message));

        let lastOrigin = 'null';
        try { lastOrigin = new URL(page.url()).origin; } catch (e) {}

        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame()) {
                let newOrigin = 'null';
                try { newOrigin = new URL(frame.url()).origin; } catch (e) {}
                
                if (newOrigin !== lastOrigin && newOrigin !== 'null' && newOrigin !== 'about:blank') {
                    logger.info(`[StateObserver] Cross-origin boundary crossed for node ${nodeId} (${lastOrigin} -> ${newOrigin}). Re-injecting.`);
                    lastOrigin = newOrigin;
                    await this.injectObservers(nodeId, page).catch(() => {});
                }

                page.evaluate(() => {
                    if (window.__stateObserverInjected && window.__stateObserverReport) {
                        function computeDomHash() {
                            const elements = document.querySelectorAll('*');
                            const tags = Array.prototype.map.call(elements, el => el.tagName).join('');
                            let hash = 0;
                            for (let i = 0; i < tags.length; i++) {
                                const char = tags.charCodeAt(i);
                                hash = ((hash << 5) - hash) + char;
                                hash = hash & hash;
                            }
                            return hash.toString(16);
                        }
                        const hlc = window.__lastHlc || { physical: Date.now(), logical: 0 };
                        window.__stateObserverReport({
                            url: location.href,
                            domHash: computeDomHash(),
                            causingCommandId: null,
                            timestamp: { physical: hlc.physical, logical: hlc.logical }
                        }).catch(() => {});
                    }
                }).catch(() => {});
            }
        });

        page.on('popup', async (popup) => {
            logger.info(`[StateObserver] Injecting observers into new popup for node ${nodeId}`);
            await this.injectObservers(nodeId, popup).catch(() => {});
        });
    }
}
