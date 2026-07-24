import EventEmitter from 'node:events';
import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';

export class HealthMonitor extends EventEmitter {
    constructor(registry) {
        super();
        this.registry = registry;
        this.intervalId = null;
    }

    startMonitoring(intervalMs = 5000) {
        this.intervalId = setInterval(() => {
            this.checkHealth();
        }, intervalMs);
    }

    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    checkHealth() {
        const browsers = this.registry.getAll();
        for (const browser of browsers) {
            if (browser.state === 'Error') {
                logger.info(`[HealthMonitor] Detected Error state on [${browser.id}]. Initiating recovery...`);
                this.registry.updateState(browser.id, 'Recovering');
                this.emit('Command', new Command({
                    category: 'Recovery',
                    type: 'HEAL_REQUESTED',
                    target: browser.id,
                    source: 'HealthMonitor'
                }));
            }
        }
    }
}
