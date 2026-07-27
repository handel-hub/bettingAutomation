export class PageStateMonitor {
    constructor() {
        this.pageStates = new Map();
    }

    async attach(page) {
        if (!page) return;
        
        // We use a symbol or specific string on the page context to prevent multiple observers
        try {
            await page.evaluate(() => {
                if (window.__pgMonitorMutCount !== undefined) return;
                
                window.__pgMonitorMutCount = 0;
                const observer = new MutationObserver((mutations) => {
                    window.__pgMonitorMutCount += mutations.length;
                });
                
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
                    window.__pgMonitorObserver = observer;
                } else {
                    // If body doesn't exist yet, wait for DOMContentLoaded
                    document.addEventListener('DOMContentLoaded', () => {
                        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
                        window.__pgMonitorObserver = observer;
                    });
                }
            });
            
            // Initialize state tracking
            this.pageStates.set(page, {
                lastCount: 0,
                lastTimestamp: Date.now(),
                state: 'UNKNOWN'
            });
        } catch (e) {
            // Page might be closed or navigating
            console.warn(`[PageStateMonitor] Failed to attach: ${e.message}`);
        }
    }

    async getStabilityState(page) {
        if (!page || (typeof page.isClosed === 'function' && page.isClosed())) {
            return 'UNKNOWN';
        }

        const stateRecord = this.pageStates.get(page);
        if (!stateRecord) {
            // Attempt to attach if we haven't already
            await this.attach(page);
            return 'UNKNOWN';
        }

        try {
            const currentCount = await page.evaluate(() => window.__pgMonitorMutCount || 0);
            const now = Date.now();
            
            const timeDiff = now - stateRecord.lastTimestamp;
            if (timeDiff <= 0) return stateRecord.state; // Avoid division by zero if queried instantly
            
            // Normalize to mutations per 200ms
            const rate = ((currentCount - stateRecord.lastCount) / timeDiff) * 200;
            
            stateRecord.lastCount = currentCount;
            stateRecord.lastTimestamp = now;

            if (rate > 20) {
                stateRecord.state = 'RENDERING';
            } else if (rate > 5) {
                stateRecord.state = 'RENDERING';
            } else if (rate > 0) {
                stateRecord.state = 'STABLE';
            } else {
                // If 0 mutations, we need to ensure at least 500ms has passed to declare IDLE confidently.
                // However, for immediate querying, if it's 0 over any time window, we can consider it STABLE.
                // The prompt says "0 mutations / 500ms -> IDLE". We can approximate this:
                if (timeDiff >= 500 && rate === 0) {
                    stateRecord.state = 'IDLE';
                } else if (rate === 0) {
                    // If less than 500ms has passed but rate is 0, it is at least STABLE
                    stateRecord.state = stateRecord.state === 'IDLE' ? 'IDLE' : 'STABLE';
                }
            }
            
            return stateRecord.state;
        } catch (e) {
            // E.g., execution context was destroyed (navigating)
            if (e.message.includes('Execution context was destroyed')) {
                return 'NAVIGATING';
            }
            return 'UNKNOWN';
        }
    }

    async getMutationRate(page) {
        if (!page || (typeof page.isClosed === 'function' && page.isClosed())) {
            return 0;
        }
        const stateRecord = this.pageStates.get(page);
        if (!stateRecord) {
            await this.attach(page);
            return 0;
        }
        try {
            const currentCount = await page.evaluate(() => window.__pgMonitorMutCount || 0);
            const now = Date.now();
            const timeDiff = now - stateRecord.lastTimestamp;
            if (timeDiff <= 0) return 0;
            const ratePerSec = ((currentCount - stateRecord.lastCount) / timeDiff) * 1000;
            stateRecord.lastCount = currentCount;
            stateRecord.lastTimestamp = now;
            return ratePerSec;
        } catch (e) {
            return 0;
        }
    }

    async detach(page) {
        if (!page) return;
        
        try {
            await page.evaluate(() => {
                if (window.__pgMonitorObserver) {
                    window.__pgMonitorObserver.disconnect();
                    delete window.__pgMonitorObserver;
                }
                delete window.__pgMonitorMutCount;
            });
        } catch (e) {
            // Ignore errors during detach (page might be closed)
        } finally {
            this.pageStates.delete(page);
        }
    }
}

export const pageStateMonitor = new PageStateMonitor();
