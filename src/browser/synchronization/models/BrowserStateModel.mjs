import { BrowserCapabilities } from './BrowserCapabilities.mjs';

/**
 * Valid lifecycle states for a browser instance.
 */
export const LifecycleState = {
    NAVIGATING: 'NAVIGATING',
    READY: 'READY',
    RECOVERING: 'RECOVERING',
    DISCONNECTED: 'DISCONNECTED',
    HUNGOVER: 'HUNGOVER'
};

export const NavigationLifecycle = {
    IDLE: 'IDLE',
    NAVIGATING: 'NAVIGATING',
    REDIRECTING: 'REDIRECTING',
    WAITING_FOR_LOAD: 'WAITING_FOR_LOAD',
    WAITING_FOR_DOM: 'WAITING_FOR_DOM',
    READY: 'READY'
};

export const NavigationResult = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    TIMEOUT: 'TIMEOUT',
    CANCELLED: 'CANCELLED'
};

/**
 * A pure data container tracking the factual reality of a specific browser context.
 * It is never mutated by itself. Only the BrowserStateRegistry updates it.
 */
export class BrowserStateModel {
    constructor(browserId) {
        this.browserId = browserId;
        
        this.lifecycleState = LifecycleState.DISCONNECTED;
        
        this.healthMetrics = {
            healthScore: 0,
            lastHeartbeat: 0,
            latency: 0,
            recoveryAttempts: 0
        };

        this.runtimeStatistics = {
            commandsExecuted: 0,
            averageBarrierLatency: 0,
            lastExecution: 0,
            lastSynchronization: 0,
            averageResolutionTime: 0
        };

        this.navigationContext = {
            targetURL: null,
            currentURL: null,
            previousURL: null,
            lifecycle: NavigationLifecycle.IDLE,
            result: null,
            navigationId: null,
            redirectCount: 0,
            navigationType: null,
            startedAt: null,
            completedAt: null,
            duration: 0
        };

        this.capabilities = new BrowserCapabilities();
    }
}
