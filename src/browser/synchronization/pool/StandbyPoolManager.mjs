import EventEmitter from 'node:events';
import { logger } from '../../../config.mjs';
import { StandbyPoolExhaustedError } from '../../execution/errors.mjs';
import { TelemetryCollector } from '../../execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { NTPClockSync } from '../../execution/time/NTPClockSync.mjs';

/**
 * Manages a warm standby pool of Playwright BrowserContext and Page instances (Candidate D Specification ENG-PLAN-V3-2026-07).
 * Provides sub-500ms atomic failover replacement when active worker browsers fail or hang.
 */
export class StandbyPoolManager extends EventEmitter {
    /**
     * @param {Object} [options={}]
     * @param {number} [options.poolSize=2] - Default warm standby pool size (M=2)
     * @param {number} [options.heartbeatIntervalMs=5000] - Interval for heartbeat health checks
     * @param {Object} [options.browser=null] - Playwright Browser instance
     */
    constructor(options = {}) {
        super();
        this.poolSize = options.poolSize ?? 2;
        this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5000;
        this.browser = options.browser ?? null;
        this.pool = []; // Array of { id, context, page, createdAt, lastHeartbeat, isHealthy }
        this._heartbeatTimer = null;
        this._isShuttingDown = false;
        this._replenishPromise = null;
    }

    /**
     * Initialize the standby pool with a Playwright browser and start background health monitoring.
     * @param {Object} browser - Playwright Browser instance
     */
    async init(browser) {
        if (browser) {
            this.browser = browser;
        }
        this._isShuttingDown = false;
        await this.replenish();
        this.startHeartbeat();
        logger.info(`[StandbyPoolManager] Initialized warm standby pool (size: ${this.pool.length}/${this.poolSize})`);
    }

    /**
     * Replenish standby pool up to target poolSize in the background without blocking failover operations.
     * @returns {Promise<void>}
     */
    async replenish() {
        if (this._isShuttingDown || !this.browser || this.pool.length >= this.poolSize) {
            return;
        }

        // Avoid concurrent replenish storms
        if (this._replenishPromise) {
            return this._replenishPromise;
        }

        this._replenishPromise = (async () => {
            try {
                while (this.pool.length < this.poolSize && !this._isShuttingDown) {
                    const id = `standby-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    try {
                        const context = await this.browser.newContext();
                        const page = await context.newPage();
                        await page.goto('about:blank').catch(() => {});
                        
                        const item = {
                            id,
                            context,
                            page,
                            createdAt: NTPClockSync.now(),
                            lastHeartbeat: NTPClockSync.now(),
                            isHealthy: true
                        };
                        
                        this.pool.push(item);
                        this.emit('PoolReplenished', { id, currentSize: this.pool.length, targetSize: this.poolSize });
                        logger.debug(`[StandbyPoolManager] Warmed standby page [${id}] (pool size: ${this.pool.length})`);
                    } catch (err) {
                        logger.error(`[StandbyPoolManager] Failed to create warm standby item [${id}]: ${err.message}`);
                        break; // Stop loop if browser is unresponsive or closed
                    }
                }
            } finally {
                this._replenishPromise = null;
            }
        })();

        return this._replenishPromise;
    }

    /**
     * Acquire a warm standby worker page for atomic failover.
     * @param {string} [targetUrl='about:blank'] - Optional destination URL to pre-navigate the standby page
     * @returns {Promise<{ id: string, context: Object, page: Object }>}
     * @throws {StandbyPoolExhaustedError} If the warm standby pool is exhausted (LF-703)
     */
    async acquireStandby(targetUrl = 'about:blank') {
        if (this._isShuttingDown) {
            throw new StandbyPoolExhaustedError('[StandbyPoolManager] Cannot acquire standby: pool manager is shutting down');
        }

        // Find the first healthy item in the pool
        const index = this.pool.findIndex(item => item.isHealthy);
        if (index === -1) {
            const errMsg = `[StandbyPoolManager] Standby pool exhausted (0/${this.poolSize} available) during worker failover attempt`;
            logger.error(errMsg);
            try {
                TelemetryCollector.registry.recordFailureCode('LF-703');
            } catch (err) {}
            this.emit('PoolExhausted', { targetUrl });
            throw new StandbyPoolExhaustedError(errMsg);
        }

        // Remove from pool
        const [standby] = this.pool.splice(index, 1);
        logger.info(`[StandbyPoolManager] Acquired standby page [${standby.id}] (remaining pool size: ${this.pool.length})`);
        this.emit('StandbyAcquired', { id: standby.id, remaining: this.pool.length });

        // Asynchronously replenish pool in background
        this.replenish().catch(err => logger.warn(`[StandbyPoolManager] Background replenish error: ${err.message}`));

        // Pre-navigate if needed
        if (targetUrl && targetUrl !== 'about:blank') {
            try {
                await standby.page.goto(targetUrl, { timeout: 10000 });
            } catch (err) {
                logger.warn(`[StandbyPoolManager] Pre-navigation of standby [${standby.id}] to ${targetUrl} failed: ${err.message}`);
            }
        }

        return {
            id: standby.id,
            context: standby.context,
            page: standby.page
        };
    }

    /**
     * Start background heartbeat monitoring to evict dead or unresponsive standby instances.
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this._heartbeatTimer = setInterval(async () => {
            if (this._isShuttingDown || this.pool.length === 0) {
                return;
            }

            for (let i = this.pool.length - 1; i >= 0; i--) {
                const item = this.pool[i];
                try {
                    // Quick health evaluation
                    const readyState = await item.page.evaluate(() => document.readyState);
                    if (!readyState) {
                        throw new Error('Null readyState');
                    }
                    item.lastHeartbeat = NTPClockSync.now();
                    item.isHealthy = true;
                } catch (err) {
                    logger.warn(`[StandbyPoolManager] Standby item [${item.id}] failed heartbeat health check: ${err.message}. Evicting.`);
                    item.isHealthy = false;
                    this.pool.splice(i, 1);
                    this.emit('StandbyEvicted', { id: item.id, reason: err.message });
                    try {
                        await item.page.close().catch(() => {});
                        await item.context.close().catch(() => {});
                    } catch (closeErr) {}
                }
            }

            // Replenish any evicted items
            if (this.pool.length < this.poolSize) {
                this.replenish().catch(() => {});
            }
        }, this.heartbeatIntervalMs);

        if (this._heartbeatTimer && typeof this._heartbeatTimer.unref === 'function') {
            this._heartbeatTimer.unref();
        }
    }

    /**
     * Stop background heartbeat monitoring.
     */
    stopHeartbeat() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    /**
     * Evict a specific standby item or clear the entire pool.
     * @param {string} [id] - Optional ID of specific standby item to evict
     */
    async evict(id) {
        if (id) {
            const index = this.pool.findIndex(item => item.id === id);
            if (index !== -1) {
                const [item] = this.pool.splice(index, 1);
                this.emit('StandbyEvicted', { id: item.id, reason: 'Explicit eviction' });
                await item.page.close().catch(() => {});
                await item.context.close().catch(() => {});
            }
        } else {
            const items = [...this.pool];
            this.pool = [];
            for (const item of items) {
                await item.page.close().catch(() => {});
                await item.context.close().catch(() => {});
            }
            this.emit('PoolCleared');
        }
    }

    /**
     * Dispose the standby pool manager, closing all contexts and cancelling timers.
     */
    async dispose() {
        this._isShuttingDown = true;
        this.stopHeartbeat();
        await this.evict();
        this.removeAllListeners();
        logger.info('[StandbyPoolManager] Disposed warm standby pool');
    }
}
