import { logger } from '../config.mjs';
import { CommandRouter } from './CommandRouter.mjs';

import {
    BrowserRegistry,
    BrowserLifecycleManager,
    SessionManager,
    NavigationSynchronizer,
    HealthMonitor,
    RecoveryManager
} from './coordination/index.mjs';

import {
    CommandReceiver,
    ActionDispatcher,
    ActionSimulator,
    MacroEngine
} from './execution/index.mjs';

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
        this.macroEngine = new MacroEngine(this.simulator);
        this.actionDispatcher = new ActionDispatcher(settings);

        const credentialsMap = new Map(accounts.map(a => [a.username, a.password]));
        this.recoveryManager = new RecoveryManager(
            this.registry,
            this.lifecycleManager,
            this.sessionManager,
            credentialsMap
        );

        this.commandRouter = new CommandRouter();
        this.setupEventBus();
    }

    setupEventBus() {
        this.commandRouter.register('Execution', '*', async (command) => {
            let targetBrowsers = [];
            
            if (command.executionMode === 'SLAVES_ONLY') {
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
            
            if (targetBrowsers.length === 0) {
                logger.warn(`Cannot execute command [${command.id}]: No target browsers for mode ${command.executionMode}`);
                return;
            }

            if (command.type === 'macro') {
                const { seqNum, validateOnly } = command.payload;
                const sequence = this.macroEngine.loadSequence(seqNum);
                if (!sequence) return;

                if (validateOnly) {
                    await this.macroEngine.validate(sequence, targetBrowsers);
                } else {
                    await this.macroEngine.execute(sequence, targetBrowsers);
                }
            } else {
                const promises = targetBrowsers.map(b => this.simulator.execute(b, command));
                await Promise.allSettled(promises);
            }
        });

        this.commandRouter.register('Navigation', 'navigate', async (command) => {
            const slaves = this.registry.getReadySlaves();
            logger.info(`Routing NavigationCommand to ${slaves.length} ready slaves: ${command.payload.url}`);
            const promises = slaves.map(b => this.simulator.execute(b, command));
            await Promise.allSettled(promises);
        });

        this.commandRouter.register('Recovery', 'HEAL_REQUESTED', async (command) => {
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

        const maxAccounts = parseInt(this.settings.Spawning.max_accounts_to_spawn || '10', 10);
        const activeAccounts = this.accounts.slice(0, maxAccounts);

        if (activeAccounts.length === 0) {
            logger.warn('No accounts configured. Exiting.');
            process.exit(0);
        }

        // 1. Master Spawning
        let masterProxyUrl = null;
        if (this.settings.Spawning.master_use_proxy === 'true') {
            masterProxyUrl = this.proxyManager.allocateProxy();
        }
        await this.lifecycleManager.spawnBrowser('master', 'master', masterProxyUrl);

        // 2. Slave Spawning & Auth
        logger.info(`Spawning ${activeAccounts.length} slave accounts...`);
        for (let i = 0; i < activeAccounts.length; i++) {
            const account = activeAccounts[i];
            const id = `slave_${i}`;
            
            const proxyUrl = this.proxyManager.allocateProxy();
            if (!proxyUrl && this.settings.Proxy.proxy_failure_mode === 'strict') {
                logger.error(`Skipping account ${account.username} due to lack of proxy (strict mode).`);
                continue;
            }

            await this.lifecycleManager.spawnBrowser(id, 'slave', proxyUrl, account.username);
            await this.sessionManager.restoreOrLogin(id, account.username, account.password);
        }

        // 3. Setup Navigation Synchronization
        await this.navSync.setupMasterSync();

        // 4. Setup Execution Dispatcher (Master Event Listeners)
        const master = this.registry.getMaster();
        if (master) {
            await this.actionDispatcher.injectMasterListeners(master.page);
        }

        // 5. Replay Startup Macro (Startup execution strategy)
        if (this.settings.Memory.replay_action_sequence === 'true') {
            logger.info('Replaying startup macro on Master...');
            const sequence = this.macroEngine.loadSequence('startup'); 
            if (sequence && master) {
                 await this.macroEngine.execute(sequence, [master]);
                 const readySlaves = this.registry.getReadySlaves();
                 await this.macroEngine.execute(sequence, readySlaves);
            }
        }

        // 6. Start Health Monitor & Command Receiver
        this.healthMonitor.startMonitoring();
        this.commandReceiver.start();

        logger.info('Automation Controller fully initialized.');
    }
}
