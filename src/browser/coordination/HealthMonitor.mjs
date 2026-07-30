import EventEmitter from 'node:events';
import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';
import featureFlags from '../execution/locatorIntelligence/FeatureFlags.mjs';

export class CircuitBreaker {
    constructor(options = {}) {
        this.state = 'CLOSED';
        this.failureTimestamps = []; // max 10 entries
        this.threshold = options.threshold || 3;
        this.windowMs = options.windowMs || 60000;
    }

    recordFailure(timestamp = Date.now()) {
        this.failureTimestamps.push(timestamp);
        const cutoff = timestamp - this.windowMs;
        this.failureTimestamps = this.failureTimestamps.filter(t => t >= cutoff);
        if (this.failureTimestamps.length > 10) {
            this.failureTimestamps = this.failureTimestamps.slice(-10);
        }
        if (this.failureTimestamps.length >= this.threshold) {
            this.state = 'OPEN';
        }
    }

    isTripped() {
        const now = Date.now();
        const cutoff = now - this.windowMs;
        this.failureTimestamps = this.failureTimestamps.filter(t => t >= cutoff);
        if (this.failureTimestamps.length < this.threshold && this.state === 'OPEN') {
            this.state = 'CLOSED';
        }
        return this.state === 'OPEN';
    }

    reset() {
        this.state = 'CLOSED';
        this.failureTimestamps = [];
    }
}

export class HealthMonitor extends EventEmitter {
    constructor(registry) {
        super();
        this.registry = registry;
        this.intervalId = null;
        this.circuitBreakers = new Map();
    }

    getCircuitBreaker(browserId) {
        if (!this.circuitBreakers) {
            this.circuitBreakers = new Map();
        }
        if (!this.circuitBreakers.has(browserId)) {
            this.circuitBreakers.set(browserId, new CircuitBreaker());
        }
        return this.circuitBreakers.get(browserId);
    }

    recordRecoveryFailure(browserId, timestamp = Date.now()) {
        const cb = this.getCircuitBreaker(browserId);
        cb.recordFailure(timestamp);
        if (cb.isTripped()) {
            logger.warn(`[HealthMonitor] Circuit Breaker TRIPPED for [${browserId}]: Exceeded ${cb.threshold} failures in ${cb.windowMs}ms.`);
            const browser = this.registry ? (typeof this.registry.get === 'function' ? this.registry.get(browserId) : null) : null;
            if (browser) {
                browser.circuitBreakerTripped = true;
            }
            this.emit('Command', new Command({
                category: 'Recovery',
                type: 'HEAL_REQUESTED',
                target: browserId,
                source: 'CircuitBreaker',
                payload: { reason: 'Circuit Breaker Tripped (3 L4 failures in 60s)', circuitBreakerTripped: true }
            }));
            return true;
        }
        return false;
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

    evaluateErrorState(browser) {
        if (!browser) return { isPhysicalCrash: false, reason: null };

        // 0. Circuit Breaker check
        const id = browser.id || browser.browserId;
        if (browser.circuitBreakerTripped === true || (id && this.circuitBreakers && this.circuitBreakers.get(id)?.isTripped())) {
            return { isPhysicalCrash: true, reason: 'Circuit Breaker TRIPPED: Exceeded recovery failure threshold' };
        }

        // V3 Decoupled Mode: Blind to command execution failures (Lifecycle: FAILED, LF-505, TypeErrors, or generic 'Error' state from command failures).
        // Only trigger on genuine physical infrastructure crashes:
        // Only trigger on genuine physical infrastructure crashes:
        
        // 1. WebSocket heartbeat silence (> 5,000ms normal, > 30,000ms if Busy executing complex extraction)
        if (browser.healthMetrics && browser.healthMetrics.lastHeartbeat > 0) {
            const silentDuration = Date.now() - browser.healthMetrics.lastHeartbeat;
            const gracePeriod = browser.state === 'Busy' ? 30000 : 5000;
            if (silentDuration > gracePeriod && browser.state !== 'Initializing') {
                return { isPhysicalCrash: true, reason: `WebSocket heartbeat silence exceeded ${gracePeriod}ms (${silentDuration}ms) [State: ${browser.state}]` };
            }
        }

        // 2. Explicit physical disconnection or OS process crash flags
        if (browser.isDisconnected === true || browser.physicalCrash === true || browser.oomFault === true) {
            return { isPhysicalCrash: true, reason: 'Physical browser disconnect, crash, or OOM fault detected' };
        }

        // 3. Playwright browser disconnection check if browser handle is present
        if (browser.browser && typeof browser.browser.isConnected === 'function' && !browser.browser.isConnected()) {
            return { isPhysicalCrash: true, reason: 'BrowserDisconnectedError: Playwright browser is disconnected' };
        }

        // Otherwise, even if commands failed (e.g. last 50 commands failed) or state was marked Error by legacy test simulation, it is NOT a physical crash!
        return { isPhysicalCrash: false, reason: null };
    }

    checkBrowserHealth(browser) {
        if (!browser) return true;
        const { isPhysicalCrash, reason } = this.evaluateErrorState(browser);
        if (isPhysicalCrash) {
            const id = browser.id || browser.browserId;
            logger.info(`[HealthMonitor] Physical crash/disconnect detected on [${id}]: ${reason}. Initiating recovery...`);
            this.registry.updateState(id, 'Recovering');
            this.emit('Command', new Command({
                category: 'Recovery',
                type: 'HEAL_REQUESTED',
                target: id,
                source: 'HealthMonitor',
                payload: { reason }
            }));
            return false;
        }
        return true;
    }

    checkHealth() {
        const browsers = this.registry.getAll();
        for (const browser of browsers) {
            this.checkBrowserHealth(browser);
        }
    }
}

