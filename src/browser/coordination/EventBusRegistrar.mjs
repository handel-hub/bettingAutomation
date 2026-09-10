import { logger } from '../../utils/logger.mjs';
import featureFlags from '../execution/locatorIntelligence/FeatureFlags.mjs';
import { Command } from '../execution/Command.mjs';

export class EventBusRegistrar {
    constructor(deps) {
        this.commandRouter = deps.commandRouter;
        this.targetResolver = deps.targetResolver;
        this.macroEngine = deps.macroEngine;
        this.scheduler = deps.scheduler;
        this.registry = deps.registry;
        this.lockManager = deps.lockManager;
        this.workflowEngine = deps.workflowEngine;
        this.recoveryManager = deps.recoveryManager;
        this.navSync = deps.navSync;
        this.actionDispatcher = deps.actionDispatcher;
        this.lifecycleManager = deps.lifecycleManager;
        this.commandReceiver = deps.commandReceiver;
        this.healthMonitor = deps.healthMonitor;
        this.syncRecoveryActionExecutor = deps.syncRecoveryActionExecutor;
        this.simulator = deps.simulator;
        this.convergenceEngine = deps.convergenceEngine;
        this.triggerRouter = deps.triggerRouter;
        this.runOrchestrator = deps.runOrchestrator;
    }

    registerAll() {
        this.commandRouter.register('Execution', '*', async (command) => {
            const lifecycle = 'BROADCAST';
            
            let interactionLog = '';
            if (command.payload && command.payload.interactionId) {
                const p = command.payload;
                interactionLog = `\n  ↳ [Interaction] ID: ${p.interactionId} | Type: ${p.interactionType} | Context: ${p.context || 'Unknown'} | Consumed: [${(p.consumedEvents || []).join(', ')}]`;
            }
            
            logger.info(`[Broadcast] Command ${command.id} [${command.type}] | Latency (Capture->Broadcast): ${Date.now() - command.captureTime}ms | Lifecycle: ${lifecycle}${interactionLog}`);
            
            // CLICK timestamp tracking is deprecated under Navigation API architecture            
            const targetBrowsers = this.targetResolver.resolve(command, logger);

            if (targetBrowsers.length === 0) {
                logger.warn(`Cannot execute command [${command.id}]: No target browsers for mode ${command.executionMode}`);
                return;
            }

            if (command.type === 'macro') {
                const { seqNum, validateOnly } = command.payload;
                const sequence = await this.macroEngine.loadSequence(seqNum);
                if (!sequence) return;

                if (validateOnly) {
                    await this.macroEngine.validate(sequence, targetBrowsers);
                } else {
                    await this.macroEngine.execute(sequence, targetBrowsers);
                }
            } else {
                targetBrowsers.forEach(b => this.scheduler.enqueue(b, command));
            }
        });

        this.commandRouter.register('Workflow', '*', async (command) => {
            let targetBrowsers = [];
            
            if (command.executionMode === 'UNIQUE_ACCOUNTS_ONLY') {
                const master = this.registry.getMaster();
                const slaves = this.registry.getReadySlaves();
                const allReadyBrowsers = master ? [master, ...slaves] : slaves;
                
                const allBrowsersByUsername = new Map();
                for (const b of this.registry.getAll()) {
                    if (b.username) {
                        if (!allBrowsersByUsername.has(b.username)) allBrowsersByUsername.set(b.username, []);
                        allBrowsersByUsername.get(b.username).push(b);
                    }
                }

                const uniqueAccounts = new Set();
                for (const browser of allReadyBrowsers) {
                    if (!uniqueAccounts.has(browser.username)) {
                        const browsersForAccount = allBrowsersByUsername.get(browser.username) || [];
                        const isAnyBusy = browsersForAccount.some(s => s.state === 'Busy');
                        
                        if (isAnyBusy) {
                            logger.warn(`Cannot route Workflow to account ${browser.username} because one or more browsers are currently Busy.`);
                            continue;
                        }

                        uniqueAccounts.add(browser.username);
                        targetBrowsers.push(browser);
                    }
                }
            } else if (command.executionMode === 'SLAVES_ONLY') {
                targetBrowsers = this.registry.getReadySlaves();
            } else if (command.executionMode === 'MASTER_ONLY') {
                const master = this.registry.getMaster();
                if (master) targetBrowsers = [master];
            } else if (command.executionMode === 'ALL') {
                const master = this.registry.getMaster();
                const slaves = this.registry.getReadySlaves();
                if (master) targetBrowsers.push(master);
                targetBrowsers.push(...slaves);
            }
            
            targetBrowsers = targetBrowsers.filter(b => {
                if (b.username && this.lockManager.isLocked(b.username)) {
                    logger.warn(`Dropping target [${b.id}] because account ${b.username} is locked.`);
                    return false;
                }
                return true;
            });

            if (targetBrowsers.length === 0) {
                logger.warn(`Cannot execute Workflow [${command.type}]: No target browsers for mode ${command.executionMode}`);
                return;
            }

            await this.workflowEngine.execute(command, targetBrowsers);
        });

        this.commandRouter.register('Navigation', 'navigate', async (command) => {
            logger.info(`[Broadcast] Command ${command.id} [Navigation] | Latency (Capture->Broadcast): ${Date.now() - command.captureTime}ms`);
            let slaves;
            if (typeof command.target === 'string') {
                const targetBrowser = this.registry.get(command.target);
                slaves = targetBrowser ? [targetBrowser] : [];
            } else {
                slaves = this.registry.getReadySlaves();
            }
            logger.info(`Routing NavigationCommand to ${slaves.length} target(s): ${command.payload.url}`);

            if (command.payload?.navClass === 'CORRECTIVE_NAV' && typeof command.payload?.baselineGes === 'number') {
                for (const target of slaves) {
                    const state = this.registry.getState(target.id);
                    const prevGes = state.currentGes;
                    state.currentGes = command.payload.baselineGes;
                    logger.info(`[EventBusRegistrar] Rebased GES on [${target.id}] from ${prevGes} to ${command.payload.baselineGes} (CORRECTIVE_NAV)`);
                    logger.info(`[Telemetry] {"event":"HEAL_GES_REBASE","browserId":"${target.id}","previousGes":${prevGes},"baselineGes":${command.payload.baselineGes}}`);
                }
            }

            const promises = slaves.map(b => {
                return new Promise((resolve) => {
                    if (this.convergenceEngine) {
                        const onAchieved = (evt) => {
                            if (evt.slaveId === b.id && evt.commandId === command.id) {
                                cleanup();
                                resolve();
                            }
                        };
                        const onDiverged = (evt) => {
                            if (evt.slaveId === b.id && evt.commandId === command.id) {
                                cleanup();
                                resolve(); // Resolve anyway so Promise.all completes; RecoveryManager handles the divergence
                            }
                        };
                        const onTimeout = (evt) => {
                            if (evt.slaveId === b.id && evt.commandId === command.id) {
                                cleanup();
                                resolve(); // Resolve anyway so Promise.all completes; RecoveryManager handles the timeout
                            }
                        };
                        const cleanup = () => {
                            this.convergenceEngine.off('ConvergenceAchieved', onAchieved);
                            this.convergenceEngine.off('ConvergenceDiverged', onDiverged);
                            this.convergenceEngine.off('ConvergenceTimeout', onTimeout);
                        };
                        this.convergenceEngine.on('ConvergenceAchieved', onAchieved);
                        this.convergenceEngine.on('ConvergenceDiverged', onDiverged);
                        this.convergenceEngine.on('ConvergenceTimeout', onTimeout);
                        
                        this.convergenceEngine.expectConvergence(b.id, command.id, command.payload.domHash, command.payload.url);
                    } else {
                        resolve();
                    }
                    this.scheduler.enqueue(b, command);
                });
            });
            await Promise.all(promises);
            logger.info(`[EventBusRegistrar] Navigation ${command.id} completed resolution across all slaves.`);
        });

        this.commandRouter.register('Recovery', 'PAGE_RELOAD', async (command) => {
            const browserId = typeof command.target === 'string' ? command.target : command.target?.browserId;
            const targetBrowser = this.registry.get(browserId);
            if (!targetBrowser || !targetBrowser.page) {
                logger.warn(`[EventBusRegistrar] Cannot execute PAGE_RELOAD: Target browser [${browserId}] not found.`);
                return;
            }
            logger.info(`[EventBusRegistrar] Executing recovery PAGE_RELOAD on [${browserId}]...`);
            try {
                this.scheduler.clearQueue(browserId);
                await targetBrowser.page.reload({ waitUntil: 'domcontentloaded' });
                this.registry.updateState(browserId, 'Ready');
                logger.info(`[EventBusRegistrar] Recovery PAGE_RELOAD successful on [${browserId}].`);
                if (targetBrowser.role === 'master') {
                    await this.navSync.setupMasterSync();
                    await this.actionDispatcher.injectMasterListeners(targetBrowser.page);
                }
            } catch (err) {
                logger.error(`[EventBusRegistrar] Recovery PAGE_RELOAD failed on [${browserId}]: ${err.message}`);
            }
        });

        this.commandRouter.register('Recovery', 'HEAL_REQUESTED', async (command) => {
            this.scheduler.clearQueue(command.target);
            await this.recoveryManager.heal(command.target);
        });

        this.commandRouter.register('Recovery', 'MASTER_HEALED', async (command) => {
            const master = this.registry.getMaster();
            if (!master) return;
            try {
                // Validation gate: Ensure master browser and page exist and are connected
                if (!master.browser || !master.page || (typeof master.browser.isConnected === 'function' && !master.browser.isConnected())) {
                    throw new Error('Master browser handle invalid or disconnected');
                }
                await this.navSync.setupMasterSync();
                await this.actionDispatcher.injectMasterListeners(master.page);
                this.registry.updateState(master.id, 'Ready');
                logger.info(`[EventBusRegistrar] Master browser successfully re-synchronized and ready.`);
            } catch (err) {
                logger.error(`Failed to re-attach master listeners after heal: ${err.message}`);
                this.registry.updateState(master.id, 'Error');
            }
        });

        this.commandRouter.register('Recovery', 'HEAL_FAILED', async (command) => {
            this.scheduler.clearQueue(command.target);
            logger.fatal(`CRITICAL: Slave [${command.target}] could not be recovered after ${command.payload.maxAttempts} attempts and is permanently dead!`);
        });

        const routeFn = (cmd) => this.commandRouter.route(cmd);
        
        // Causal Suppression: Intercept Hotkeys
        this.commandReceiver.on('Command', (cmd) => {
            if (this.triggerRouter) {
                const intercepted = this.triggerRouter.interceptHotkey(cmd, 'master');
                if (intercepted) this.commandRouter.route(intercepted);
            } else {
                routeFn(cmd);
            }
        });

        // Causal Suppression: Intercept DOM Sync (Feedback Loop Guard)
        this.actionDispatcher.on('Command', (cmd) => {
            const masterId = cmd.metadata?.browserId || 'master';
            // 1. If currently executing an Automation Run, drop ALL Master DOM Syncs 
            // to prevent the ActionSimulator's physical clicks from echoing as user intent.
            if (this.runOrchestrator && this.runOrchestrator.isExecuting(masterId)) {
                logger.debug(`[EventBusRegistrar] Dropped DOM_SYNC command [${cmd.type}] because Master [${masterId}] is EXECUTING.`);
                if (cmd.ges !== undefined && cmd.ges !== null) {
                    this.commandRouter.route(new Command({
                        category: 'Execution',
                        type: 'NOOP',
                        target: {},
                        source: 'EventBusRegistrar',
                        ges: cmd.ges,
                        executionMode: 'SLAVES_ONLY',
                        payload: { reason: 'Master EXECUTING drop' }
                    }));
                }
                return;
            }

            // 2. If PASSIVE, check if this click is a Place Bet trigger.
            if (this.triggerRouter) {
                const intercepted = this.triggerRouter.interceptDomSync(cmd, masterId);
                if (Array.isArray(intercepted)) {
                    intercepted.forEach(c => this.commandRouter.route(c));
                } else if (intercepted) {
                    this.commandRouter.route(intercepted);
                }
            } else {
                routeFn(cmd);
            }
        });

        this.navSync.on('Command', routeFn);
        this.healthMonitor.on('Command', routeFn);
        this.recoveryManager.on('Command', routeFn);
        this.syncRecoveryActionExecutor.on('Command', routeFn);

        // ActionFailure no longer marks the browser as Error (V3 Health Monitor Decoupling is permanent).

        // SPEC-03: Catch failover promotion and inject necessary master capabilities
        this.registry.on('WORKER_FAILOVER', async ({ newMasterId, previousMasterId }) => {
            logger.info(`[EventBusRegistrar] Handling failover promotion for ${newMasterId}`);
            const newMaster = this.registry.getBrowser(newMasterId);
            if (newMaster && newMaster.page) {
                try {
                    // Re-inject Stealth and Capability Providers
                    await this.lifecycleManager.stealthEngine.injectAll(newMaster.page);
                    // Task 3.6: Inject AOIS overlay capabilities
                    if (this.simulator && this.simulator.injectOverlayScript) {
                        await this.simulator.injectOverlayScript(newMaster.page);
                    }
                    // Re-inject ActionDispatcher capture listeners
                    await this.actionDispatcher.injectMasterListeners(newMaster.page);
                } catch (e) {
                    logger.error(`[EventBusRegistrar] Failed to inject master scripts during failover: ${e.message}`);
                }
            }
        });
    }
}
