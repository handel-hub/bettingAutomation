import { BrowserStateModel, LifecycleState } from './models/BrowserStateModel.mjs';
import { NTPClockSync } from '../execution/time/NTPClockSync.mjs';
import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';

/**
 * A central registry holding BrowserStateModel instances.
 * This is the authoritative owner of mutations for BrowserStateModel.
 */
export class BrowserStateRegistry extends EventEmitter {
    constructor(options = {}) {
        super();
        this.states = new Map();
    }

    /**
     * Retrieves the state model for a browser. Creates one if it doesn't exist.
     * @param {string} browserId 
     * @returns {BrowserStateModel}
     */
    getState(browserId) {
        if (!this.states.has(browserId)) {
            this.states.set(browserId, new BrowserStateModel(browserId));
        }
        return this.states.get(browserId);
    }

    /**
     * Increments the Slave GES.
     * Must only be called when Slave successfully executes the sequence.
     */
    incrementSlaveGes(browserId) {
        const state = this.getState(browserId);
        state.currentGes++;
        this.emit('StateUpdated', { browserId, state });
    }

    /**
     * Mutates the state of a browser and emits an update event.
     * @param {string} browserId 
     * @param {Object} updates 
     */
    update(browserId, updates) {
        const state = this.getState(browserId);
        
        if (updates.lifecycleState !== undefined) {
            state.lifecycleState = updates.lifecycleState;
        }

        if (updates.healthMetrics) {
            Object.assign(state.healthMetrics, updates.healthMetrics);
        }

        if (updates.runtimeStatistics) {
            Object.assign(state.runtimeStatistics, updates.runtimeStatistics);
        }

        if (updates.navigationContext) {
            Object.assign(state.navigationContext, updates.navigationContext);
        }

        if (updates.windowContext) {
            Object.assign(state.windowContext, updates.windowContext);
        }

        if (updates.viewportContext) {
            Object.assign(state.viewportContext, updates.viewportContext);
        }

        if (updates.scrollContext) {
            Object.assign(state.scrollContext, updates.scrollContext);
        }

        if (updates.executionContext) {
            Object.assign(state.executionContext, updates.executionContext);
        }

        if (updates.consistencyState) {
            Object.assign(state.consistencyState, updates.consistencyState);
        }

        if (updates.recoveryState) {
            Object.assign(state.recoveryState, updates.recoveryState);
        }

        if (updates.synchronizationStatistics) {
            Object.assign(state.synchronizationStatistics, updates.synchronizationStatistics);
        }

        if (updates.capabilities) {
            for (const [cap, data] of Object.entries(updates.capabilities)) {
                if (typeof data === 'object' && data !== null) {
                    state.capabilities.setSatisfied(cap, data.value, data.epoch);
                } else {
                    state.capabilities.setSatisfied(cap, data);
                }
            }
        }

        this.emit('StateUpdated', { browserId, state });
    }

    /**
     * Executes atomic failover replacement for a broken or hung worker browser using a newly spawned context.
     * Replaces context and page handles, migrates session cookies, and emits WORKER_FAILOVER.
     * @param {string} brokenId - Browser ID of the broken worker
     * @param {string} [targetUrl=null] - Optional URL to restore navigation state
     * @returns {Promise<BrowserStateModel>} The updated state model with new handles
     */
    async failover(brokenId, targetUrl = null) {
        const oldState = this.getState(brokenId);
        const destinationUrl = targetUrl ?? oldState.url ?? 'about:blank';
        
        logger.warn(`[BrowserStateRegistry] Initiating atomic failover for broken worker [${brokenId}] (targetUrl: ${destinationUrl})`);
        
        if (!oldState.browser) {
            throw new Error(`[BrowserStateRegistry] Cannot perform failover: browser instance not found for [${brokenId}]`);
        }

        // On-demand context creation (ENG-008 Fix for IP leak)
        let proxyServer = undefined;
        if (oldState.proxyUrl) {
            proxyServer = { server: oldState.proxyUrl };
        }
        
        const standbyContext = await oldState.browser.newContext({
            proxy: proxyServer
        });
        const standbyPage = await standbyContext.newPage();
        const standbyId = `standby-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        if (destinationUrl && destinationUrl !== 'about:blank') {
            try {
                await standbyPage.goto(destinationUrl, { timeout: 10000 });
            } catch (err) {
                logger.warn(`[BrowserStateRegistry] Pre-navigation of standby [${standbyId}] to ${destinationUrl} failed: ${err.message}`);
            }
        }
        
        // Migrate session cookies if available
        if (oldState.context && typeof oldState.context.cookies === 'function') {
            try {
                const cookies = await oldState.context.cookies();
                if (Array.isArray(cookies) && cookies.length > 0) {
                    await standbyContext.addCookies(cookies);
                    logger.debug(`[BrowserStateRegistry] Migrated ${cookies.length} session cookies during failover for [${brokenId}]`);
                }
            } catch (cookieErr) {
                logger.warn(`[BrowserStateRegistry] Could not migrate cookies during failover for [${brokenId}]: ${cookieErr.message}`);
            }
        }
        
        // Close broken handles asynchronously in background without blocking failover latency
        if (oldState.page && typeof oldState.page.close === 'function') {
            oldState.page.close().catch(() => {});
        }
        if (oldState.context && typeof oldState.context.close === 'function') {
            oldState.context.close().catch(() => {});
        }

        // Atomically rebind worker state
        oldState.context = standbyContext;
        oldState.page = standbyPage;
        oldState.state = 'Ready';
        oldState.health = 'Good';
        oldState.url = destinationUrl;
        oldState.lifecycleState = LifecycleState.READY;
        oldState.recoveryState = {
            ...oldState.recoveryState,
            lastFailover: NTPClockSync.now(),
            failoverCount: (oldState.recoveryState?.failoverCount ?? 0) + 1,
            previousStandbyId: standbyId
        };

        logger.info(`[BrowserStateRegistry] Atomic failover completed for [${brokenId}] using standby [${standbyId}]`);
        this.emit('WORKER_FAILOVER', { browserId: brokenId, standbyId: standbyId, targetUrl: destinationUrl });
        this.emit('StateUpdated', { browserId: brokenId, state: oldState });
        
        return oldState;
    }

    // --- Unified Legacy Registry Methods ---

    register(id, role, browser, context, page, meta = {}) {
        const state = this.getState(id);
        state.role = role;
        state.browser = browser;
        state.context = context;
        state.page = page;
        state.username = meta.username ?? null;
        state.proxyUrl = meta.proxyUrl ?? null;
        
        // Map legacy states to new states if possible, but maintain legacy strings for now
        state.state = 'Initializing';
        state.health = 'Good';
        state.url = 'about:blank';
        
        this.emit('StateUpdated', { browserId: id, state });
    }

    get(id) {
        // Return the BrowserStateModel. If it doesn't exist, legacy returned undefined.
        return this.states.get(id);
    }

    getAll() {
        return Array.from(this.states.values());
    }

    getReadySlaves() {
        return this.getAll().filter(b => b.role === 'slave' && b.state === 'Ready');
    }

    getMaster() {
        return this.getAll().find(b => b.role === 'master');
    }

    updateState(id, stateValue) {
        if (this.states.has(id)) {
            const state = this.states.get(id);
            state.state = stateValue;
            
            // Bridge: 'Ready' -> LifecycleState.READY, 'Error' -> LifecycleState.DISCONNECTED
            if (stateValue === 'Ready') state.lifecycleState = LifecycleState.READY;
            if (stateValue === 'Error') state.lifecycleState = LifecycleState.DISCONNECTED;
            
            this.emit('StateUpdated', { browserId: id, state });
        }
    }

    updateHealth(id, healthValue) {
        if (this.states.has(id)) {
            const state = this.states.get(id);
            state.health = healthValue;
            this.emit('StateUpdated', { browserId: id, state });
        }
    }

    updateUrl(id, urlValue) {
        if (this.states.has(id)) {
            const state = this.states.get(id);
            state.url = urlValue;
            this.emit('StateUpdated', { browserId: id, state });
        }
    }

    remove(id) {
        this.states.delete(id);
    }

    /**
     * Dispose the registry.
     */
    async dispose() {
        this.states.clear();
        this.removeAllListeners();
    }
}



