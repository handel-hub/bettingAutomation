import { logger } from '../config.mjs';

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
        this.recoveryManager = new RecoveryManager(this.lifecycleManager, this.sessionManager);

        // --- Initialize Execution Subsystem ---
        this.commandReceiver = new CommandReceiver(settings);
        this.simulator = new ActionSimulator();
        this.macroEngine = new MacroEngine(this.simulator);
        this.actionDispatcher = new ActionDispatcher(settings);

        this.setupEventBus();
    }

    setupEventBus() {
        // Coordination Events
        this.healthMonitor.on('HealthFailure', (browserId) => {
            this.recoveryManager.heal(browserId);
        });

        // Execution Events
        const handleExecution = async (command) => {
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
        };

        this.commandReceiver.on('ExecutionRequested', handleExecution);
        this.actionDispatcher.on('ExecutionRequested', handleExecution);

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

            await this.lifecycleManager.spawnBrowser(id, 'slave', proxyUrl);
            
            const loaded = await this.sessionManager.loadSession(id, account.username);
            if (!loaded) {
                const loggedIn = await this.sessionManager.login(id, account.username, account.password);
                if (loggedIn) {
                    await this.sessionManager.saveSession(id, account.username);
                }
            } else {
                const browserObj = this.registry.get(id);
                await browserObj.page.goto('https://www.sportybet.com/', { waitUntil: 'domcontentloaded' });
                this.registry.updateState(id, 'Ready');
            }
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
