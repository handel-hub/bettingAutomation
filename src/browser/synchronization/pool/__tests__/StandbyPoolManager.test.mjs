import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StandbyPoolManager } from '../StandbyPoolManager.mjs';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { StandbyPoolExhaustedError } from '../../../execution/errors.mjs';
import { TelemetryCollector } from '../../../execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { LifecycleState } from '../../models/BrowserStateModel.mjs';

describe('Milestone 3: Standby Worker Pool & Dynamic Resilience Engine Tests', () => {
    let mockBrowser;
    let createdContexts;

    beforeEach(() => {
        TelemetryCollector.reset();
        createdContexts = [];
        
        mockBrowser = {
            newContext: vi.fn().mockImplementation(async () => {
                const mockCookies = [];
                const context = {
                    newPage: vi.fn().mockImplementation(async () => {
                        const page = {
                            goto: vi.fn().mockResolvedValue(true),
                            evaluate: vi.fn().mockImplementation(async (fn) => {
                                // Simulate readyState check
                                return 'complete';
                            }),
                            close: vi.fn().mockResolvedValue(true),
                            url: vi.fn().mockReturnValue('about:blank')
                        };
                        return page;
                    }),
                    cookies: vi.fn().mockImplementation(async () => mockCookies),
                    addCookies: vi.fn().mockImplementation(async (cookies) => {
                        mockCookies.push(...cookies);
                    }),
                    close: vi.fn().mockResolvedValue(true)
                };
                createdContexts.push(context);
                return context;
            })
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('StandbyPoolManager Unit Tests', () => {
        let poolMgr;

        afterEach(async () => {
            if (poolMgr) {
                await poolMgr.dispose();
            }
        });

        it('initializes warm standby pool up to default poolSize (M=2)', async () => {
            poolMgr = new StandbyPoolManager({ poolSize: 2, browser: mockBrowser });
            await poolMgr.init();

            expect(mockBrowser.newContext).toHaveBeenCalledTimes(2);
            expect(poolMgr.pool.length).toBe(2);
            expect(poolMgr.pool[0].isHealthy).toBe(true);
            expect(poolMgr.pool[1].isHealthy).toBe(true);
        });

        it('acquireStandby() pops a warm page and triggers background replenishment', async () => {
            poolMgr = new StandbyPoolManager({ poolSize: 2, browser: mockBrowser });
            await poolMgr.init();

            const acquired = await poolMgr.acquireStandby('http://target.test');
            expect(acquired.id).toMatch(/^standby-/);
            expect(acquired.page.goto).toHaveBeenCalledWith('http://target.test', expect.any(Object));

            // Pool size immediately drops to 1, then replenishes back to 2 in background
            await new Promise(r => setTimeout(r, 20)); // Allow background replenish microtask
            expect(mockBrowser.newContext).toHaveBeenCalledTimes(3); // 2 initial + 1 replenish
            expect(poolMgr.pool.length).toBe(2);
        });

        it('throws StandbyPoolExhaustedError (LF-703) and records telemetry when pool is exhausted', async () => {
            poolMgr = new StandbyPoolManager({ poolSize: 1, browser: mockBrowser });
            await poolMgr.init();

            // Acquire the only item in pool
            const item1 = await poolMgr.acquireStandby();
            expect(item1).toBeDefined();

            // Prevent background replenishment and clear pool to simulate total exhaustion during cascade
            poolMgr.browser = null;
            poolMgr.pool = [];

            const err = await poolMgr.acquireStandby().catch(e => e);
            expect(err).toBeInstanceOf(StandbyPoolExhaustedError);
            expect(err.message).toMatch(/Standby pool exhausted/);
            expect(TelemetryCollector.registry.failures.get('LF-703')).toBeGreaterThanOrEqual(1);
        });

        it('heartbeat monitor evicts unhealthy standby pages and automatically replenishes', async () => {
            vi.useFakeTimers();
            poolMgr = new StandbyPoolManager({ poolSize: 2, heartbeatIntervalMs: 1000, browser: mockBrowser });
            await poolMgr.init();

            expect(poolMgr.pool.length).toBe(2);
            const badPageItem = poolMgr.pool[0];
            
            // Make the first page fail readyState check
            badPageItem.page.evaluate.mockRejectedValueOnce(new Error('Target page closed'));

            // Advance timer by heartbeat interval
            vi.advanceTimersByTime(1000);
            await vi.runOnlyPendingTimersAsync();

            // Unhealthy item should be evicted and closed
            expect(badPageItem.page.close).toHaveBeenCalledTimes(1);
            expect(badPageItem.context.close).toHaveBeenCalledTimes(1);

            // Pool should replenish back to 2
            await vi.runOnlyPendingTimersAsync();
            expect(poolMgr.pool.length).toBe(2);
            expect(poolMgr.pool.find(i => i.id === badPageItem.id)).toBeUndefined();

            vi.useRealTimers();
        });
    });

    describe('BrowserStateRegistry Atomic Failover Integration Tests', () => {
        let registry;
        let poolMgr;

        beforeEach(async () => {
            poolMgr = new StandbyPoolManager({ poolSize: 2, browser: mockBrowser });
            await poolMgr.init();
            registry = new BrowserStateRegistry({ standbyPool: poolMgr });
        });

        afterEach(async () => {
            await registry.dispose();
        });

        it('failover() atomically replaces broken worker handles with warm standby in under 500ms', async () => {
            // Register broken worker
            const brokenContext = await mockBrowser.newContext();
            const brokenPage = await brokenContext.newPage();
            registry.register('slave-1', 'slave', mockBrowser, brokenContext, brokenPage);
            registry.updateUrl('slave-1', 'http://app.local/dashboard');

            const start = Date.now();
            const updatedState = await registry.failover('slave-1');
            const latency = Date.now() - start;

            expect(latency).toBeLessThan(500);
            expect(updatedState.context).not.toBe(brokenContext);
            expect(updatedState.page).not.toBe(brokenPage);
            expect(updatedState.state).toBe('Ready');
            expect(updatedState.health).toBe('Good');
            expect(updatedState.lifecycleState).toBe(LifecycleState.READY);
            expect(updatedState.recoveryState.failoverCount).toBe(1);
            expect(updatedState.recoveryState.previousStandbyId).toMatch(/^standby-/);
        });

        it('failover() migrates session cookies from broken context to new standby context', async () => {
            const brokenContext = await mockBrowser.newContext();
            await brokenContext.addCookies([
                { name: 'session_id', value: 'xyz123', domain: 'app.local', path: '/' },
                { name: 'auth_token', value: 'secret99', domain: 'app.local', path: '/' }
            ]);
            const brokenPage = await brokenContext.newPage();
            registry.register('slave-cookie-test', 'slave', mockBrowser, brokenContext, brokenPage);

            const updatedState = await registry.failover('slave-cookie-test', 'http://app.local/secure');
            
            const migratedCookies = await updatedState.context.cookies();
            expect(migratedCookies).toHaveLength(2);
            expect(migratedCookies.map(c => c.name)).toContain('session_id');
            expect(migratedCookies.map(c => c.name)).toContain('auth_token');
        });

        it('failover() emits WORKER_FAILOVER and StateUpdated telemetry events', async () => {
            const brokenContext = await mockBrowser.newContext();
            const brokenPage = await brokenContext.newPage();
            registry.register('slave-events', 'slave', mockBrowser, brokenContext, brokenPage);

            const failoverListener = vi.fn();
            const stateListener = vi.fn();
            registry.on('WORKER_FAILOVER', failoverListener);
            registry.on('StateUpdated', stateListener);

            await registry.failover('slave-events', 'http://app.local/target');

            expect(failoverListener).toHaveBeenCalledTimes(1);
            expect(failoverListener.mock.calls[0][0]).toEqual({
                browserId: 'slave-events',
                standbyId: expect.stringMatching(/^standby-/),
                targetUrl: 'http://app.local/target'
            });

            expect(stateListener).toHaveBeenCalledWith(expect.objectContaining({
                browserId: 'slave-events',
                state: expect.objectContaining({ state: 'Ready' })
            }));
        });
    });
});
