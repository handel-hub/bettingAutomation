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

export const ViewportLifecycle = {
    UNKNOWN: 'UNKNOWN',
    MEASURING: 'MEASURING',
    SYNCING: 'SYNCING',
    VALIDATING: 'VALIDATING',
    READY: 'READY'
};

export const ScrollLifecycle = {
    UNKNOWN: 'UNKNOWN',
    IDLE: 'IDLE',
    SCROLLING: 'SCROLLING',
    SETTLING: 'SETTLING',
    WAITING_FOR_CONTENT: 'WAITING_FOR_CONTENT',
    VALIDATING: 'VALIDATING',
    READY: 'READY'
};

export const ExecutionContextLifecycle = {
    UNKNOWN: 'UNKNOWN',
    DISCOVERING: 'DISCOVERING',
    ATTACHING: 'ATTACHING',
    VALIDATING: 'VALIDATING',
    READY: 'READY',
    FRAME_NOT_FOUND: 'FRAME_NOT_FOUND',
    FRAME_DETACHED: 'FRAME_DETACHED',
    SHADOW_NOT_FOUND: 'SHADOW_NOT_FOUND',
    SHADOW_DETACHED: 'SHADOW_DETACHED',
    CROSS_ORIGIN: 'CROSS_ORIGIN',
    TIMEOUT: 'TIMEOUT',
    UNSUPPORTED: 'UNSUPPORTED'
};

/**
 * Encapsulates the visual and layout boundaries of the page.
 */
export class ViewportContext {
    constructor(data = {}) {
        this.version = data.version || 0;
        this.viewportId = data.viewportId || 'window';
        this.layoutViewportWidth = data.layoutViewportWidth || 0;
        this.layoutViewportHeight = data.layoutViewportHeight || 0;
        this.dpr = data.dpr || 1;
        this.orientation = data.orientation || 'landscape-primary';
        this.visualViewportScale = data.visualViewportScale || 1;
        this.capturedAt = data.capturedAt || Date.now();
        this.lifecycle = data.lifecycle || ViewportLifecycle.UNKNOWN;
    }
}

/**
 * Encapsulates the scroll positions and kinematics of the page and nested containers.
 */
export class ScrollContext {
    constructor(data = {}) {
        this.version = data.version || 0;
        this.scrollId = data.scrollId || null;
        this.source = data.source || 'UNKNOWN'; // WINDOW_SCROLL, ELEMENT_SCROLL, PROGRAMMATIC_SCROLL, AUTO_SCROLL
        this.pageScrollX = data.pageScrollX || 0;
        this.pageScrollY = data.pageScrollY || 0;
        this.containerScrollX = data.containerScrollX || 0;
        this.containerScrollY = data.containerScrollY || 0;
        this.activeContainerId = data.activeContainerId || null;
        this.direction = data.direction || 'none';
        this.velocity = data.velocity || 0;
        this.lastScrollTime = data.lastScrollTime || 0;
        this.lifecycle = data.lifecycle || ScrollLifecycle.UNKNOWN;
    }
}

/**
 * A pure data container tracking the factual reality of a specific browser context.
 * It is never mutated by itself. Only the BrowserStateRegistry updates it.
 */
export class BrowserStateModel {
    constructor(browserId) {
        this.browserId = browserId;
        
        this.lifecycleState = LifecycleState.DISCONNECTED;
        this.navigationEpoch = 0;
        
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

        this.windowContext = {
            outerWidth: 0,
            outerHeight: 0,
            screenX: 0,
            screenY: 0,
            maximized: false,
            minimized: false,
            fullscreen: false
        };

        this.viewportContext = {
            version: 0,
            lifecycle: ViewportLifecycle.UNKNOWN,
            lastResize: null,
            viewportId: null,
            dpr: 1,
            orientation: null,
            layoutViewportWidth: 0,
            layoutViewportHeight: 0,
            visualViewportOffsetX: 0,
            visualViewportOffsetY: 0,
            visualViewportScale: 1,
            visualViewportWidth: 0,
            visualViewportHeight: 0
        };

        this.scrollContext = {
            version: 0,
            lifecycle: ScrollLifecycle.UNKNOWN,
            source: 'UNKNOWN',
            scrollId: null,
            pageScrollX: 0,
            pageScrollY: 0,
            containerScrollX: 0,
            containerScrollY: 0,
            activeContainerId: null,
            direction: 'none',
            velocity: 0,
            lastScrollTime: 0
        };

        this.executionContext = {
            version: 0,
            lifecycle: ExecutionContextLifecycle.UNKNOWN,
            currentFrame: null,
            frameHierarchy: [],
            parentFrame: null,
            childFrames: [],
            shadowHierarchy: [],
            contextState: 'UNKNOWN',
            lastContextChange: 0
        };

        this.consistencyState = {
            consistencyScore: 0,
            lastEvaluated: 0,
            policy: null
        };

        this.recoveryState = {
            currentStrategy: null,
            attempts: 0,
            lastRecovery: 0,
            isRecovering: false,
            lastResult: null
        };

        this.synchronizationStatistics = {
            latency: 0,
            waitDurations: [],
            successRate: 0,
            totalBarriers: 0,
            failedBarriers: 0,
            recoveryCount: 0
        };

        this.capabilities = new BrowserCapabilities();
    }
}
