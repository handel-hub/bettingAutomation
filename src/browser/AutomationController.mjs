import { logger } from '../config.mjs';
import { CommandRouter } from './CommandRouter.mjs';
import { TargetResolver } from './coordination/TargetResolver.mjs';

import {
    BrowserRegistry,
    BrowserLifecycleManager,
    SessionManager,
    NavigationSynchronizer,
    HealthMonitor,
    RecoveryManager,
    AccountLockManager
} from './coordination/index.mjs';

import {
    CommandReceiver,
    ActionDispatcher,
    ActionSimulator,
    ExecutionScheduler,
    MacroEngine,
    WorkflowEngine
} from './execution/index.mjs';

import { CapabilityRegistry } from './synchronization/CapabilityRegistry.mjs';
import { DOMCapabilityProvider } from './synchronization/providers/DOMCapabilityProvider.mjs';
import { ConnectionCapabilityProvider } from './synchronization/providers/ConnectionCapabilityProvider.mjs';

export class AutomationController {
    constructor(settings, accounts, proxyManager, stealthEngine) {
        this.settings = settings;
        this.accounts = accounts;
        this.proxyManager = proxyManager;

        // --- Initialize Coordination Subsystem ---
        this.registry = new BrowserRegistry();
        this.lifecycleManager = new BrowserLifecycleManager(this.registry, settings, stealthEngine);
        this.sessionManager = new SessionManager(this.registry);
        this.navSync = new NavigationSynchronizer(this.registry);
        this.healthMonitor = new HealthMonitor(this.registry);

        // --- Initialize Execution Subsystem ---
        this.commandReceiver = new CommandReceiver(settings);
        this.simulator = new ActionSimulator();
        this.scheduler = new ExecutionScheduler(this.simulator);
        this.macroEngine = new MacroEngine(this.simulator, this.scheduler);
        this.actionDispatcher = new ActionDispatcher(settings);
        this.lockManager = new AccountLockManager();
        this.workflowEngine = new WorkflowEngine(this.lockManager, this.registry);

        const credentialsMap = new Map(accounts.map(a => [a.username, a.password]));
        this.recoveryManager = new RecoveryManager(
            this.registry,
            this.lifecycleManager,
            this.sessionManager,
            credentialsMap
        );

        this.commandRouter = new CommandRouter();
        this.targetResolver = new TargetResolver(this.registry, this.lockManager);
        this.setupEventBus();
    }

    setupEventBus() {
        this.commandRouter.register('Execution', '*', async (command) => {
            const lifecycle = 'BROADCAST';
            
            let interactionLog = '';
            if (command.payload && command.payload.interactionId) {
                const p = command.payload;
                interactionLog = `\n  ↳ [Interaction] ID: ${p.interactionId} | Type: ${p.interactionType} | Context: ${p.context || 'Unknown'} | Consumed: [${(p.consumedEvents || []).join(', ')}]`;
            }
            
            logger.info(`[Broadcast] Command ${command.id} [${command.type}] | Latency (Capture->Broadcast): ${Date.now() - command.captureTime}ms | Lifecycle: ${lifecycle}${interactionLog}`);
            
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
            const slaves = this.registry.getReadySlaves();
            logger.info(`Routing NavigationCommand to ${slaves.length} ready slaves: ${command.payload.url}`);
            slaves.forEach(b => this.scheduler.enqueue(b, command));
        });

        this.commandRouter.register('Recovery', 'HEAL_REQUESTED', async (command) => {
            this.scheduler.clearQueue(command.target);
            await this.recoveryManager.heal(command.target);
        });

        this.commandRouter.register('Recovery', 'MASTER_HEALED', async (command) => {
            const master = this.registry.getMaster();
            if (!master) return;
            try {
                await this.navSync.setupMasterSync();
                await this.actionDispatcher.injectMasterListeners(master.page);
                this.registry.updateState(master.id, 'Ready');
            } catch (err) {
                logger.error(`Failed to re-attach master listeners after heal: ${err.message}`);
                // Don't leave it stuck in 'Initializing' forever - flag it
                // as Error so HealthMonitor's poll picks it up and runs a
                // fresh heal cycle rather than silently staying broken.
                this.registry.updateState(master.id, 'Error');
            }
        });

        this.commandRouter.register('Recovery', 'HEAL_FAILED', async (command) => {
            this.scheduler.clearQueue(command.target);
            logger.fatal(`CRITICAL: Slave [${command.target}] could not be recovered after ${command.payload.maxAttempts} attempts and is permanently dead!`);
        });

        const routeFn = (cmd) => this.commandRouter.route(cmd);
        
        this.commandReceiver.on('Command', routeFn);
        this.actionDispatcher.on('Command', routeFn);
        this.navSync.on('Command', routeFn);
        this.healthMonitor.on('Command', routeFn);
        this.recoveryManager.on('Command', routeFn);

        // Bridge: Simulator Success/Failure -> Registry Metadata
        this.simulator.on('ActionFailure', ({ id, error }) => {
            this.registry.updateState(id, 'Error');
        });
    }

    async start() {
        logger.info('Starting Automation Controller...');

        // DI Bootstrap: Register synchronization providers
        CapabilityRegistry.registerProvider(new ConnectionCapabilityProvider());
        CapabilityRegistry.registerProvider(new DOMCapabilityProvider());
        
        // Dynamic import to prevent circular dependencies if any, but regular import is fine.
        const { NavigationCapabilityProvider } = await import('./synchronization/providers/NavigationCapabilityProvider.mjs');
        CapabilityRegistry.registerProvider(new NavigationCapabilityProvider());

        const { ViewportCapabilityProvider } = await import('./synchronization/providers/ViewportCapabilityProvider.mjs');
        CapabilityRegistry.registerProvider(new ViewportCapabilityProvider());

        const { ScrollCapabilityProvider } = await import('./synchronization/providers/scroll/ScrollCapabilityProvider.mjs');
        CapabilityRegistry.registerProvider(new ScrollCapabilityProvider());

        const { FrameCapabilityProvider } = await import('./synchronization/providers/frame/FrameCapabilityProvider.mjs');
        CapabilityRegistry.registerProvider(new FrameCapabilityProvider());

        let maxAccounts = parseInt(this.settings.Spawning.max_accounts_to_spawn, 10);
        if (!Number.isInteger(maxAccounts) || maxAccounts <= 0) {
            logger.warn(`Invalid or missing max_accounts_to_spawn ("${this.settings.Spawning.max_accounts_to_spawn}") — defaulting to all ${this.accounts.length} configured accounts.`);
            maxAccounts = this.accounts.length;
        }
        const activeAccounts = [];
        for (let i = 0; i < maxAccounts; i++) {
            activeAccounts.push(this.accounts[i % this.accounts.length]);
        }

        if (activeAccounts.length === 0) {
            logger.warn('No accounts configured. Exiting.');
            process.exit(0);
        }

        const masterAccount = activeAccounts[0];
        const slaveAccounts = activeAccounts.slice(1);

        // 1. Master Spawning & Auth
        let masterProxyUrl = null;
        if (this.settings.Spawning.master_use_proxy === 'true') {
            masterProxyUrl = this.proxyManager.allocateProxy();
            if (!masterProxyUrl && this.settings.Proxy.proxy_failure_mode === 'strict') {
                logger.error('master_use_proxy=true but no proxy is available (strict mode). Refusing to launch master unprotected.');
                process.exit(1);
            }
        }
        await this.lifecycleManager.spawnBrowser('master', 'master', masterProxyUrl, masterAccount.username);
        
        logger.info(`Authenticating Master browser with account: ${masterAccount.username}`);
        await this.sessionManager.restoreOrLogin('master', masterAccount.username, masterAccount.password);

        // 2. Slave Spawning & Auth
        if (slaveAccounts.length > 0) {
            logger.info(`Spawning ${slaveAccounts.length} slave accounts...`);
            for (let i = 0; i < slaveAccounts.length; i++) {
                const account = slaveAccounts[i];
                const id = `slave_${i}`;
                
                const proxyUrl = this.proxyManager.allocateProxy();
                if (!proxyUrl && this.settings.Proxy.proxy_failure_mode === 'strict') {
                    logger.error(`Skipping account ${account.username} due to lack of proxy (strict mode).`);
                    continue;
                }

                await this.lifecycleManager.spawnBrowser(id, 'slave', proxyUrl, account.username);
                await this.sessionManager.restoreOrLogin(id, account.username, account.password);
            }
        } else {
            logger.warn('Only 1 account provided in accounts.txt. No slaves will be spawned (Master took the first account).');
        }

        // 3. Setup Navigation Synchronization
        await this.navSync.setupMasterSync();

        // 4. Replay Startup Macro (moved up, BEFORE listener injection)
        const master = this.registry.getMaster();
        if (this.settings.Memory.replay_action_sequence === 'true') {
            logger.info('Replaying startup macro on Master...');
            const sequence = this.macroEngine.loadSequence('startup'); 
            if (sequence && master) {
                 await this.macroEngine.execute(sequence, [master]);
                 const readySlaves = this.registry.getReadySlaves();
                 await this.macroEngine.execute(sequence, readySlaves);
            }
        }

        // 5. Setup Execution Dispatcher (Master Event Listeners)
        if (master) {
            await this.actionDispatcher.injectMasterListeners(master.page);
        }

        // 6. Start Health Monitor & Command Receiver
        this.healthMonitor.startMonitoring();
        this.commandReceiver.start();

        logger.info('Automation Controller fully initialized.');
    }
}
