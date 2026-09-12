import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventEmitter from 'node:events';
import { ClusterOrchestrator } from '../../../../src/browser/coordination/ClusterOrchestrator.mjs';
import { RecoveryManager } from '../../../../src/browser/coordination/RecoveryManager.mjs';
import { CDPMutex } from '../../../../src/browser/synchronization/coordination/CDPMutex.mjs';
import { RunOrchestrator } from '../../../../src/browser/coordination/RunOrchestrator.mjs';
import { EventBusRegistrar } from '../../../../src/browser/coordination/EventBusRegistrar.mjs';
import { Command } from '../../../../src/browser/execution/Command.mjs';
import { RecoveryCoordinator } from '../../../../src/browser/synchronization/coordination/RecoveryCoordinator.mjs';
import { SynchronizationBarrier } from '../../../../src/browser/synchronization/SynchronizationBarrier.mjs';
import { CommandRouter } from '../../../../src/browser/CommandRouter.mjs';
import { Capabilities } from '../../../../src/browser/synchronization/capabilities.mjs';

describe('Verified Recovery Architecture & Stability Fixes', () => {

    describe('1. Startup Session Resolution Decoupling', () => {
        let orchestrator;
        let mockRegistry;
        let mockLifecycleManager;
        let mockSessionManager;
        let mockStateObserver;
        let mockNavSync;
        let mockActionDispatcher;
        let mockHealthMonitor;
        let mockCommandReceiver;

        beforeEach(() => {
            const browsers = new Map();
            mockRegistry = {
                states: browsers,
                getAll: vi.fn(() => Array.from(browsers.values())),
                get: vi.fn((id) => browsers.get(id)),
                getMaster: vi.fn(() => browsers.get('master')),
                getReadySlaves: vi.fn(() => Array.from(browsers.values()).filter(b => b.role === 'slave' && b.state === 'Ready')),
                remove: vi.fn((id) => browsers.delete(id)),
                on: vi.fn()
            };

            mockLifecycleManager = {
                spawnBrowser: vi.fn(async (id, role, proxyUrl, username) => {
                    browsers.set(id, {
                        id,
                        role,
                        username,
                        proxyUrl,
                        state: 'Initializing',
                        page: {},
                        browser: { close: vi.fn().mockResolvedValue() }
                    });
                })
            };

            mockSessionManager = {
                restoreOrLogin: vi.fn(async (id) => {
                    // Simulate non-instantaneous session restoration
                    return new Promise((res) => {
                        setTimeout(() => {
                            const b = browsers.get(id);
                            if (b) b.state = 'Ready';
                            res(true);
                        }, 20);
                    });
                })
            };

            mockStateObserver = { injectObservers: vi.fn().mockResolvedValue() };
            mockNavSync = { setupMasterSync: vi.fn().mockResolvedValue() };
            mockActionDispatcher = { init: vi.fn().mockResolvedValue(), injectMasterListeners: vi.fn().mockResolvedValue() };
            mockHealthMonitor = { startMonitoring: vi.fn(), stopMonitoring: vi.fn() };
            mockCommandReceiver = { start: vi.fn(), on: vi.fn() };

            orchestrator = new ClusterOrchestrator({
                settings: {
                    Spawning: { max_accounts_to_spawn: '2' },
                    Proxy: { proxy_failure_mode: 'relaxed' },
                    Memory: { replay_action_sequence: 'false' }
                },
                accounts: [
                    { username: 'master_user', password: 'm_pw' },
                    { username: 'slave_user', password: 's_pw' }
                ],
                proxies: [],
                registry: mockRegistry,
                lifecycleManager: mockLifecycleManager,
                sessionManager: mockSessionManager,
                stateObserver: mockStateObserver,
                navSync: mockNavSync,
                actionDispatcher: mockActionDispatcher,
                healthMonitor: mockHealthMonitor,
                commandReceiver: mockCommandReceiver,
                capabilityRegistry: { registerProvider: vi.fn() },
                syncManager: {},
                macroEngine: {},
                scheduler: { purgeAggregated: vi.fn() },
                passiveShadowDaemon: null,
                bettingAuthorizationRegistry: { enable: vi.fn(), disable: vi.fn() }
            });
        });

        it('completes start() with inline session resolution (deterministic)', async () => {
            await orchestrator.start();

            // Infrastructure must be online
            expect(mockLifecycleManager.spawnBrowser).toHaveBeenCalledWith('master', 'master', null, 'master_user');
            expect(mockLifecycleManager.spawnBrowser).toHaveBeenCalledWith('slave_0', 'slave', null, 'slave_user');
            expect(mockNavSync.setupMasterSync).toHaveBeenCalled();
            expect(mockActionDispatcher.init).toHaveBeenCalled();
            expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
            expect(mockCommandReceiver.start).toHaveBeenCalled();

            // Sessions must have been resolved INLINE during start(), not in background
            expect(mockSessionManager.restoreOrLogin).toHaveBeenCalledWith('master', 'master_user', 'm_pw');
            expect(mockSessionManager.restoreOrLogin).toHaveBeenCalledWith('slave_0', 'slave_user', 's_pw');

            // Auth must happen BEFORE infra setup (spawnBrowser call order proves sequencing)
            const spawnCalls = mockLifecycleManager.spawnBrowser.mock.invocationCallOrder;
            const authCalls = mockSessionManager.restoreOrLogin.mock.invocationCallOrder;
            // Master auth must come after master spawn, before slave spawn
            expect(authCalls[0]).toBeGreaterThan(spawnCalls[0]); // master auth after master spawn
            expect(authCalls[0]).toBeLessThan(spawnCalls[1]);    // master auth before slave spawn
            // Slave auth must come after slave spawn
            expect(authCalls[1]).toBeGreaterThan(spawnCalls[1]); // slave auth after slave spawn
        });
    });

    describe('2. Master Recovery Session Restoration & Validation Gate', () => {
        let recoveryManager;
        let mockRegistry;
        let mockLifecycleManager;
        let mockSessionManager;
        let mockCdpMutex;
        let credentialsMap;
        let commandEvents;

        beforeEach(() => {
            const browsers = new Map();
            browsers.set('master', {
                id: 'master',
                role: 'master',
                username: 'master_user',
                proxyUrl: null,
                state: 'Error',
                context: {},
                browser: { isConnected: vi.fn(() => true), close: vi.fn().mockResolvedValue() },
                page: {}
            });

            mockRegistry = {
                get: vi.fn((id) => browsers.get(id)),
                remove: vi.fn((id) => browsers.delete(id)),
                register: vi.fn((id, role, browser, context, page, meta) => {
                    browsers.set(id, { id, role, browser, context, page, ...meta, state: 'Initializing' });
                }),
                getMaster: vi.fn(() => browsers.get('master'))
            };

            mockLifecycleManager = {
                spawnBrowser: vi.fn(async (id, role, proxyUrl, username) => {
                    browsers.set(id, {
                        id,
                        role,
                        username,
                        proxyUrl,
                        state: 'Initializing',
                        browser: { isConnected: vi.fn(() => true), close: vi.fn().mockResolvedValue() },
                        page: {}
                    });
                })
            };

            mockSessionManager = {
                restoreOrLogin: vi.fn().mockResolvedValue(true),
                verifyLoggedIn: vi.fn().mockResolvedValue(true)
            };

            mockCdpMutex = {
                acquireRecoveryLock: vi.fn().mockResolvedValue(true),
                releaseRecoveryLock: vi.fn()
            };

            credentialsMap = new Map([['master_user', 'secret_master_pw']]);
            commandEvents = [];

            recoveryManager = new RecoveryManager(
                mockRegistry,
                mockLifecycleManager,
                mockSessionManager,
                credentialsMap,
                { cdpMutex: mockCdpMutex, maxAttempts: 2, baseDelayMs: 10 }
            );

            recoveryManager.on('Command', (cmd) => commandEvents.push(cmd));
        });

        it('restores session for master during respawn before emitting MASTER_HEALED', async () => {
            await recoveryManager.respawn('master', 'master', null, 'master_user');

            expect(mockLifecycleManager.spawnBrowser).toHaveBeenCalledWith('master', 'master', null, 'master_user');
            expect(mockSessionManager.restoreOrLogin).toHaveBeenCalledWith('master', 'master_user', 'secret_master_pw');

            const masterHealedCmd = commandEvents.find(c => c.type === 'MASTER_HEALED');
            expect(masterHealedCmd).toBeDefined();
            expect(masterHealedCmd.category).toBe('Recovery');
            expect(masterHealedCmd.target).toBe('master');
        });

        it('validation gate: fails heal attempt if browser is disconnected after respawn', async () => {
            let attempt = 0;
            mockLifecycleManager.spawnBrowser.mockImplementation(async (id, role) => {
                attempt++;
                const isConnected = attempt > 1;
                mockRegistry.get.mockReturnValue({
                    id,
                    role,
                    state: isConnected ? 'Ready' : 'Error',
                    browser: { isConnected: () => isConnected, close: vi.fn().mockResolvedValue() },
                    page: {}
                });
            });

            await recoveryManager.heal('master');

            expect(mockLifecycleManager.spawnBrowser).toHaveBeenCalledTimes(2);
            expect(mockCdpMutex.releaseRecoveryLock).toHaveBeenCalledWith('master');
        });
    });

    describe('3. Slave Recovery & GES Rebase in Navigation Handler', () => {
        let commandRouter;
        let mockRegistry;
        let mockScheduler;
        let eventBusRegistrar;
        let slaveState;

        beforeEach(() => {
            slaveState = {
                id: 'slave_0',
                role: 'slave',
                state: 'Ready',
                currentGes: 0,
                page: {}
            };

            mockRegistry = {
                get: vi.fn((id) => id === 'slave_0' ? slaveState : null),
                getState: vi.fn((id) => id === 'slave_0' ? slaveState : null),
                getMaster: vi.fn(() => ({ id: 'master', role: 'master', currentGes: 42 })),
                getReadySlaves: vi.fn(() => [slaveState]),
                updateState: vi.fn((id, s) => { if (id === 'slave_0') slaveState.state = s; }),
                on: vi.fn()
            };

            mockScheduler = {
                enqueue: vi.fn(),
                clearQueue: vi.fn()
            };

            const handlers = new Map();
            commandRouter = {
                register: vi.fn((cat, type, fn) => {
                    handlers.set(`${cat}:${type}`, fn);
                }),
                route: vi.fn(async (cmd) => {
                    const fn = handlers.get(`${cmd.category}:${cmd.type}`);
                    if (fn) await fn(cmd);
                })
            };

            const mockActionDispatcher = new EventEmitter();
            mockActionDispatcher.injectMasterListeners = vi.fn();

            const mockNavSync = new EventEmitter();
            mockNavSync.setupMasterSync = vi.fn();

            eventBusRegistrar = new EventBusRegistrar({
                commandRouter,
                commandReceiver: new EventEmitter(),
                scheduler: mockScheduler,
                registry: mockRegistry,
                navSync: mockNavSync,
                actionDispatcher: mockActionDispatcher,
                healthMonitor: new EventEmitter(),
                recoveryManager: new EventEmitter(),
                syncRecoveryActionExecutor: new EventEmitter()
            });

            eventBusRegistrar.registerAll();
        });

        it('rebases slave currentGes to baselineGes upon CORRECTIVE_NAV command', async () => {
            expect(slaveState.currentGes).toBe(0);

            const correctiveCmd = new Command({
                category: 'Navigation',
                type: 'navigate',
                target: 'slave_0',
                payload: {
                    url: 'https://www.sportybet.com/sport/football',
                    navClass: 'CORRECTIVE_NAV',
                    baselineGes: 42
                },
                source: 'RecoveryManager'
            });

            await commandRouter.route(correctiveCmd);

            expect(slaveState.currentGes).toBe(42);
            expect(mockScheduler.enqueue).toHaveBeenCalledWith(slaveState, correctiveCmd);
        });
    });

    describe('4. CDPMutex 60s TTL', () => {
        it('has a 60-second TTL to accommodate full heal cycles', () => {
            const mutex = new CDPMutex();
            expect(mutex.TTL_MS).toBe(60000);
        });
    });

    describe('5. RunOrchestrator WAL Hydration on Startup', () => {
        let mockRunLedger;
        let mockRegistry;
        let mockCommandRouter;

        beforeEach(() => {
            mockRegistry = { on: vi.fn() };
            mockCommandRouter = { on: vi.fn() };
        });

        it('hydrates unresolved PROCESSING runs from WAL into activeRuns as UNCERTAIN', async () => {
            mockRunLedger = {
                getUnresolvedRuns: vi.fn().mockResolvedValue([
                    {
                        runId: 'run-wal-1',
                        cycleId: 'cycle-wal-1',
                        accountId: 'slave_0',
                        state: 'PROCESSING',
                        timestamp: Date.now() - 5000
                    }
                ]),
                append: vi.fn()
            };

            const orchestrator = new RunOrchestrator(
                mockRunLedger,
                mockRegistry,
                mockCommandRouter,
                { isAuthorized: () => true }
            );

            // Wait for async hydrateFromWal to settle
            await new Promise(r => setTimeout(r, 20));

            expect(mockRunLedger.getUnresolvedRuns).toHaveBeenCalled();
            expect(orchestrator.isExecuting('slave_0')).toBe(true);

            const activeRun = orchestrator.activeRuns.get('slave_0');
            expect(activeRun).toBeDefined();
            expect(activeRun.runId).toBe('run-wal-1');
            expect(activeRun.state).toBe('UNCERTAIN');
            expect(activeRun.triggerSource).toBe('WAL_RECOVERY');

            // Account must reject new ownership requests while UNCERTAIN
            const newLease = orchestrator.acquireOwnership('slave_0', 'MANUAL_TRIGGER');
            expect(newLease).toBeNull();
        });

        it('handles empty WAL cleanly without creating active runs', async () => {
            mockRunLedger = {
                getUnresolvedRuns: vi.fn().mockResolvedValue([]),
                append: vi.fn()
            };

            const orchestrator = new RunOrchestrator(
                mockRunLedger,
                mockRegistry,
                mockCommandRouter,
                { isAuthorized: () => true }
            );

            await new Promise(r => setTimeout(r, 20));

            expect(orchestrator.activeRuns.size).toBe(0);
            expect(orchestrator.isExecuting('slave_0')).toBe(false);
        });
    });

    describe('6. SynchronizationBarrier resets recoveryState.attempts on barrier success', () => {
        let mockRegistry;
        let mockSyncManager;
        let browserState;

        beforeEach(() => {
            browserState = {
                id: 'slave_0',
                navigationEpoch: 1,
                capabilities: { isSatisfied: () => true },
                recoveryState: { attempts: 3, lastRecovery: Date.now() }
            };

            mockRegistry = {
                getState: vi.fn(() => browserState),
                update: vi.fn((id, updates) => {
                    if (updates.recoveryState) {
                        Object.assign(browserState.recoveryState, updates.recoveryState);
                    }
                })
            };

            mockSyncManager = {
                registry: mockRegistry,
                awaitCapabilities: vi.fn().mockResolvedValue({
                    satisfied: true,
                    satisfiedCapabilities: [Capabilities.SCROLL_READY],
                    missingCapabilities: [],
                    blockingCapability: null,
                    providerTelemetry: [],
                    snapshot: { consistency: 100 }
                }),
                timeline: null,
                telemetry: null
            };
        });

        it('resets recovery attempts to 0 when barrier evaluation succeeds', async () => {
            const executionContext = { addTrace: vi.fn() };
            const syncContext = {
                browserId: 'slave_0',
                profile: { level: [Capabilities.SCROLL_READY] },
                context: executionContext,
                deadline: Date.now() + 5000,
                syncManager: mockSyncManager
            };

            const result = await SynchronizationBarrier.wait(syncContext);

            expect(result.status).toBe('PASSED');
            expect(mockRegistry.update).toHaveBeenCalledWith('slave_0', {
                recoveryState: { attempts: 0 }
            });
            expect(browserState.recoveryState.attempts).toBe(0);
        });

        it('does not issue redundant updates if attempts is already 0', async () => {
            browserState.recoveryState.attempts = 0;
            const executionContext = { addTrace: vi.fn() };
            const syncContext = {
                browserId: 'slave_0',
                profile: { level: [Capabilities.SCROLL_READY] },
                context: executionContext,
                deadline: Date.now() + 5000,
                syncManager: mockSyncManager
            };

            const result = await SynchronizationBarrier.wait(syncContext);

            expect(result.status).toBe('PASSED');
            expect(mockRegistry.update).not.toHaveBeenCalled();
        });
    });

    describe('7. RecoveryCoordinator caps SCROLL_READY recovery at DEPENDENCY_CASCADE', () => {
        let coordinator;
        let mockRegistry;

        beforeEach(() => {
            mockRegistry = {
                update: vi.fn()
            };
            coordinator = new RecoveryCoordinator(mockRegistry);
        });

        it('caps strategy at DEPENDENCY_CASCADE on attempt 4 for SCROLL_READY (does not escalate to PAGE_RELOAD)', async () => {
            const snapshot = {
                browserId: 'slave_0',
                consistency: 90,
                recoveryState: { attempts: 3 } // Next attempt will be 4
            };

            const plan = await coordinator.recover(snapshot, Capabilities.SCROLL_READY);

            expect(plan.strategy).toBe('DEPENDENCY_CASCADE');
            expect(plan.escalateTo).toBeNull();
        });

        it('caps strategy at DEPENDENCY_CASCADE on attempt 5+ for SCROLL_READY (does not escalate to BROWSER_RESTART)', async () => {
            const snapshot = {
                browserId: 'slave_0',
                consistency: 90,
                recoveryState: { attempts: 4 } // Next attempt will be 5
            };

            const plan = await coordinator.recover(snapshot, Capabilities.SCROLL_READY);

            expect(plan.strategy).toBe('DEPENDENCY_CASCADE');
            expect(plan.escalateTo).toBeNull();
        });

        it('does not escalate to BROWSER_RESTART for SCROLL_READY even if consistency < 30', async () => {
            const snapshot = {
                browserId: 'slave_0',
                consistency: 10,
                recoveryState: { attempts: 0 }
            };

            const plan = await coordinator.recover(snapshot, Capabilities.SCROLL_READY);

            expect(plan.strategy).toBe('SOFT_RESET');
            expect(plan.strategy).not.toBe('BROWSER_RESTART');
        });

        it('preserves PAGE_RELOAD and BROWSER_RESTART escalation for non-scroll capabilities', async () => {
            // Attempt 4 for DOM_READY -> PAGE_RELOAD
            const snapshotAttempt4 = {
                browserId: 'slave_0',
                consistency: 90,
                recoveryState: { attempts: 3 }
            };
            const plan4 = await coordinator.recover(snapshotAttempt4, Capabilities.DOM_READY);
            expect(plan4.strategy).toBe('PAGE_RELOAD');
            expect(plan4.escalateTo).toBe('BROWSER_RESTART');

            // Attempt 5 for DOM_READY -> BROWSER_RESTART
            const snapshotAttempt5 = {
                browserId: 'slave_0',
                consistency: 90,
                recoveryState: { attempts: 4 }
            };
            const plan5 = await coordinator.recover(snapshotAttempt5, Capabilities.DOM_READY);
            expect(plan5.strategy).toBe('BROWSER_RESTART');
            expect(plan5.escalateTo).toBeNull();

            // Low consistency for DOM_READY -> immediate BROWSER_RESTART
            const snapshotLow = {
                browserId: 'slave_0',
                consistency: 20,
                recoveryState: { attempts: 0 }
            };
            const planLow = await coordinator.recover(snapshotLow, Capabilities.DOM_READY);
            expect(planLow.strategy).toBe('BROWSER_RESTART');
        });
    });

    describe('8. EventBusRegistrar restores scroll position on reloaded slave', () => {
        let commandRouter;
        let mockRegistry;
        let mockScheduler;
        let registrar;
        let slaveBrowser;
        let masterBrowser;

        beforeEach(() => {
            commandRouter = new CommandRouter();
            
            slaveBrowser = {
                id: 'slave_0',
                role: 'slave',
                state: 'Error',
                page: {
                    reload: vi.fn().mockResolvedValue(),
                    evaluate: vi.fn().mockResolvedValue()
                }
            };

            masterBrowser = {
                id: 'master',
                role: 'master',
                state: 'Ready',
                scrollContext: {
                    rhoX: 0.25,
                    rhoY: 0.75,
                    pageScrollX: 100,
                    pageScrollY: 600
                },
                page: {}
            };

            mockRegistry = {
                get: vi.fn((id) => (id === 'slave_0' ? slaveBrowser : (id === 'master' ? masterBrowser : null))),
                getMaster: vi.fn(() => masterBrowser),
                updateState: vi.fn((id, state) => {
                    if (id === 'slave_0') slaveBrowser.state = state;
                }),
                update: vi.fn(),
                on: vi.fn()
            };

            mockScheduler = {
                clearQueue: vi.fn()
            };

            registrar = new EventBusRegistrar({
                commandRouter,
                targetResolver: { resolve: () => [] },
                macroEngine: {},
                scheduler: mockScheduler,
                registry: mockRegistry,
                lockManager: { isLocked: () => false },
                workflowEngine: {},
                recoveryManager: { heal: vi.fn(), on: vi.fn() },
                navSync: { setupMasterSync: vi.fn(), on: vi.fn() },
                actionDispatcher: { injectMasterListeners: vi.fn(), on: vi.fn() },
                lifecycleManager: {},
                commandReceiver: { on: vi.fn() },
                healthMonitor: { on: vi.fn() },
                syncRecoveryActionExecutor: { on: vi.fn() },
                simulator: {},
                convergenceEngine: null,
                triggerRouter: null,
                runOrchestrator: null
            });

            registrar.registerAll();
        });

        it('restores canonical master scroll state on reloaded slave before setting Ready', async () => {
            const reloadCommand = new Command({
                category: 'Recovery',
                type: 'PAGE_RELOAD',
                target: 'slave_0',
                source: 'RecoveryActionExecutor'
            });

            await commandRouter.route(reloadCommand);

            // Queue cleared
            expect(mockScheduler.clearQueue).toHaveBeenCalledWith('slave_0');
            // Page reloaded
            expect(slaveBrowser.page.reload).toHaveBeenCalledWith({ waitUntil: 'domcontentloaded' });
            // Master scroll position evaluated on slave
            expect(slaveBrowser.page.evaluate).toHaveBeenCalledTimes(1);
            // Registry scrollContext updated on slave
            expect(mockRegistry.update).toHaveBeenCalledWith('slave_0', {
                scrollContext: masterBrowser.scrollContext
            });
            // Slave state updated to Ready
            expect(mockRegistry.updateState).toHaveBeenCalledWith('slave_0', 'Ready');
        });
    });
});

