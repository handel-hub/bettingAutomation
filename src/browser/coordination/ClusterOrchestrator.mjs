import { logger } from '../../config.mjs';

export class ClusterOrchestrator {
    constructor(deps) {
        this.settings = deps.settings;
        this.accounts = deps.accounts;
        this.proxyManager = deps.proxyManager;
        this.lifecycleManager = deps.lifecycleManager;
        this.sessionManager = deps.sessionManager;
        this.navSync = deps.navSync;
        this.registry = deps.registry;
        this.capabilityRegistry = deps.capabilityRegistry;
        this.syncManager = deps.syncManager;
        this.macroEngine = deps.macroEngine;
        this.actionDispatcher = deps.actionDispatcher;
        this.healthMonitor = deps.healthMonitor;
        this.commandReceiver = deps.commandReceiver;
        this.scheduler = deps.scheduler;
    }

    async start() {
        logger.info('Starting Automation Controller...');

        // Dynamic import to prevent circular dependencies if any, but regular import is fine.
        const { ConnectionCapabilityProvider } = await import('../synchronization/providers/ConnectionCapabilityProvider.mjs');
        const { DOMCapabilityProvider } = await import('../synchronization/providers/DOMCapabilityProvider.mjs');
        
        this.capabilityRegistry.registerProvider(new ConnectionCapabilityProvider(this.registry, this.syncManager));
        this.capabilityRegistry.registerProvider(new DOMCapabilityProvider(this.registry, this.syncManager));
        
        const { NavigationCapabilityProvider } = await import('../synchronization/providers/NavigationCapabilityProvider.mjs');
        this.capabilityRegistry.registerProvider(new NavigationCapabilityProvider(this.registry, this.syncManager));

        const { ViewportCapabilityProvider } = await import('../synchronization/providers/ViewportCapabilityProvider.mjs');
        this.capabilityRegistry.registerProvider(new ViewportCapabilityProvider(this.registry, this.syncManager));

        const { ScrollCapabilityProvider } = await import('../synchronization/providers/scroll/ScrollCapabilityProvider.mjs');
        this.capabilityRegistry.registerProvider(new ScrollCapabilityProvider(this.registry, this.syncManager));

        const { FrameCapabilityProvider } = await import('../synchronization/providers/frame/FrameCapabilityProvider.mjs');
        this.capabilityRegistry.registerProvider(new FrameCapabilityProvider(this.registry, this.syncManager));

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
            const sequence = await this.macroEngine.loadSequence('startup'); 
            if (sequence && master) {
                 await this.macroEngine.execute(sequence, [master]);
                 const readySlaves = this.registry.getReadySlaves();
                 await this.macroEngine.execute(sequence, readySlaves);
            }
        }

        // 5. Setup Execution Dispatcher (Master Event Listeners)
        await this.actionDispatcher.init();
        if (master) {
            await this.actionDispatcher.injectMasterListeners(master.page);
        }

        // 6. Start Health Monitor & Command Receiver
        this.healthMonitor.startMonitoring();
        this.commandReceiver.start();

        logger.info('Automation Controller fully initialized.');
    }

    async stop() {
        logger.info('Initiating graceful shutdown of Automation Controller...');
        
        try {
            this.healthMonitor.stopMonitoring();
            this.scheduler.dispose();
            
            const browsers = this.registry.getAll();
            const closePromises = browsers.map(async (b) => {
                try {
                    if (b.browser) {
                        logger.info(`Closing browser [${b.id}]...`);
                        await b.browser.close();
                    }
                } catch (err) {
                    logger.error(`Failed to close browser [${b.id}]: ${err.message}`);
                }
            });
            
            await Promise.allSettled(closePromises);
            logger.info('Graceful shutdown complete.');
        } catch (err) {
            logger.error(`Error during shutdown: ${err.message}`);
        }
    }
}
