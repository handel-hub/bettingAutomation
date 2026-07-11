import EventEmitter from 'node:events';
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
