import EventEmitter from 'node:events';

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
            if (browser.state === 'Error' || browser.health === 'Bad') {
                this.emit('HealthFailure', browser.id);
            }
        }
    }
}
