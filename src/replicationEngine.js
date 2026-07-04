const { logger } = require('./config');

class ReplicationEngine {
    constructor(slavePages, sessionManager) {
        this.slavePages = slavePages; // Array of playwright Page objects
        this.sessionManager = sessionManager;
    }

    async setupMaster(masterPage) {
        // Expose a function that the browser can call when an event happens
        await masterPage.exposeFunction('replicateEventToSlaves', async (eventData) => {
            logger.info(`[Master Action] ${eventData.type} on ${eventData.selector || eventData.url}`);
            
            // Record for startup memory
            if (this.sessionManager) {
                this.sessionManager.recordAction(eventData);
            }

            // Replicate to all slaves concurrently
            const promises = this.slavePages.map(async (slavePage) => {
                try {
                    if (eventData.type === 'click') {
                        await slavePage.click(eventData.selector, { timeout: 5000 });
                    } else if (eventData.type === 'input') {
                        await slavePage.fill(eventData.selector, eventData.value, { timeout: 5000 });
                    } else if (eventData.type === 'navigate') {
                        await slavePage.goto(eventData.url, { waitUntil: 'domcontentloaded' });
                    }
                } catch (err) {
                    logger.warn(`Failed to replicate ${eventData.type} to a slave: ${err.message}`);
                }
            });

            await Promise.allSettled(promises);
        });

        // Inject script into master to track events
        await masterPage.addInitScript(() => {
            function getCssSelector(el) {
                if (!(el instanceof Element)) return;
                let path = [];
                while (el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.nodeName.toLowerCase();
                    if (el.id) {
                        selector += '#' + el.id;
                        path.unshift(selector);
                        break;
                    } else {
                        let sib = el, nth = 1;
                        while (sib = sib.previousElementSibling) {
                            if (sib.nodeName.toLowerCase() == selector) nth++;
                        }
                        if (nth != 1) selector += ":nth-of-type("+nth+")";
                    }
                    path.unshift(selector);
                    el = el.parentNode;
                }
                return path.join(" > ");
            }

            document.addEventListener('click', (e) => {
                const selector = getCssSelector(e.target);
                if (selector) {
                    window.replicateEventToSlaves({ type: 'click', selector });
                }
            }, true);

            document.addEventListener('input', (e) => {
                const selector = getCssSelector(e.target);
                if (selector) {
                    window.replicateEventToSlaves({ type: 'input', selector, value: e.target.value });
                }
            }, true);
            
            // Navigation tracking via history API overrides
            const originalPushState = history.pushState;
            history.pushState = function() {
                originalPushState.apply(this, arguments);
                window.replicateEventToSlaves({ type: 'navigate', url: location.href });
            };
            window.addEventListener('popstate', () => {
                window.replicateEventToSlaves({ type: 'navigate', url: location.href });
            });
        });
        
        logger.info('Master replication listener injected.');
    }
}

module.exports = { ReplicationEngine };
