import EventEmitter from 'node:events';
import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';
import featureFlags from '../execution/locatorIntelligence/FeatureFlags.mjs';

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

    evaluateErrorState(browser) {
        if (!browser) return { isPhysicalCrash: false, reason: null };

        const decoupled = featureFlags.isEnabled('V3_DECOUPLE_HEALTH_MONITOR');
        if (!decoupled) {
            // Legacy mode: Any 'Error' state triggers physical recovery
            if (browser.state === 'Error' || browser.lifecycleState === 'DISCONNECTED' || browser.lifecycleState === 'HUNGOVER') {
                return { isPhysicalCrash: true, reason: `Legacy Error state detected (${browser.state || browser.lifecycleState})` };
            }
            return { isPhysicalCrash: false, reason: null };
        }

        // V3 Decoupled Mode: Blind to command execution failures (Lifecycle: FAILED, LF-505, TypeErrors, or generic 'Error' state from command failures).
        // Only trigger on genuine physical infrastructure crashes:
        
        // 1. WebSocket heartbeat silence (> 5,000ms)
        if (browser.healthMetrics && browser.healthMetrics.lastHeartbeat > 0) {
            const silentDuration = Date.now() - browser.healthMetrics.lastHeartbeat;
            if (silentDuration > 5000 && browser.state !== 'Initializing') {
                return { isPhysicalCrash: true, reason: `WebSocket heartbeat silence exceeded 5,000ms (${silentDuration}ms)` };
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

