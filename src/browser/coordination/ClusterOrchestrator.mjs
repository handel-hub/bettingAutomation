import { logger } from '../../utils/logger.mjs';

export class ClusterOrchestrator {
    constructor(deps) {
        this.settings = deps.settings;
        this.accounts = deps.accounts;
        this.proxies = deps.proxies || [];
        this.proxyIndex = 0;
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
        this.stateObserver = deps.stateObserver;
        this.passiveShadowDaemon = deps.passiveShadowDaemon;
        this.bettingAuthorizationRegistry = deps.bettingAuthorizationRegistry;
    }

        _allocateProxy() {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.proxyIndex];
        this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
        return proxy;
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
        const scrollCapabilityProvider = new ScrollCapabilityProvider(this.registry, this.syncManager);
        this.capabilityRegistry.registerProvider(scrollCapabilityProvider);

        // Wire scroll convergence handler for trailing-edge Slave reconciliation
        const { ScrollConvergenceHandler } = await import('../synchronization/providers/scroll/ScrollConvergenceHandler.mjs');
        this.scrollConvergenceHandler = new ScrollConvergenceHandler(this.registry);
        scrollCapabilityProvider.events.on('ScrollConvergenceRequired', (data) => {
            // Purge stale scroll commands from all Slave queues BEFORE convergence
            if (data.browserId === this.registry.getMaster()?.id) {
                for (const slave of this.registry.getReadySlaves()) {
                    const slaveId = slave.id || slave.browserId;
                    const purged = this.scheduler.purgeAggregated(slaveId);
                    if (purged > 0) {
                        logger.info(`[ScrollConvergence] Purged ${purged} stale scroll commands from ${slaveId}`);
                    }
                }
            }
            this.scrollConvergenceHandler.handleScrollConvergenceRequired(data);
        });
        this.registry.on('WORKER_FAILOVER', ({ browserId }) => {
            this.scrollConvergenceHandler.resetSlaveVersion(browserId);
        });

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
            throw new Error('No accounts configured');
        }

        const masterAccount = activeAccounts[0];
        const slaveAccounts = activeAccounts.slice(1);

        // 1. Master Spawning & Auth
        let masterProxyUrl = null;
        if (this.settings.Spawning.master_use_proxy === 'true') {
            masterProxyUrl = this._allocateProxy();
            if (!masterProxyUrl && this.settings.Proxy.proxy_failure_mode === 'strict') {
                logger.error('master_use_proxy=true but no proxy is available (strict mode). Refusing to launch master unprotected.');
                throw new Error('No proxy available in strict mode');
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
                
                const proxyUrl = this._allocateProxy();
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
        const master = this.registry.getMaster();
        if (master && master.page) {
            await this.stateObserver.injectObservers(master.id, master.page);
            if (this.passiveShadowDaemon) {
                await this.passiveShadowDaemon.attachToPage(master.id, master.page);
            }
        }
        for (const slave of this.registry.getReadySlaves()) {
             await this.stateObserver.injectObservers(slave.id, slave.page);
        }

        // 4. Replay Startup Macro (moved up, BEFORE listener injection)
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

    // --- Observability & Worker Lifecycle Management ---
    // Tracks the currently active command on each worker to prevent silent orphans

    lease(browserId, command) {
        if (!this.activeCommands) this.activeCommands = new Map();
        this.activeCommands.set(browserId, command);
        
        // Emit WORKER_ASSIGNED
        import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
            observabilityCollector.emitTransition({
                commandId: command.id || command.commandId,
                traceId: command.traceId || null,
                interactionId: command.interactionId || null,
                prevState: 'IDLE', // or WAITING
                newState: 'BUSY',
                eventName: 'WORKER_ASSIGNED',
                owner: 'ClusterOrchestrator',
                browserId: browserId
            });
        }).catch(() => {});
    }

    release(browserId) {
        if (!this.activeCommands) this.activeCommands = new Map();
        const command = this.activeCommands.get(browserId);
        if (command) {
            this.activeCommands.delete(browserId);
            import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                observabilityCollector.emitTransition({
                    commandId: command.id || command.commandId,
                    traceId: command.traceId || null,
                    interactionId: command.interactionId || null,
                    prevState: 'BUSY',
                    newState: 'RETURNED',
                    eventName: 'WORKER_RELEASED',
                    owner: 'ClusterOrchestrator',
                    browserId: browserId
                });
            }).catch(() => {});
        }
    }

    handleWorkerFailure(browserId, reason) {
        if (!this.activeCommands) this.activeCommands = new Map();
        const command = this.activeCommands.get(browserId);
        if (command) {
            this.activeCommands.delete(browserId);
            logger.error(`[ClusterOrchestrator] Worker ${browserId} failed mid-execution. Orphaned command: ${command.id}`);
            import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                observabilityCollector.emitTransition({
                    commandId: command.id || command.commandId,
                    traceId: command.traceId || null,
                    interactionId: command.interactionId || null,
                    prevState: 'BUSY',
                    newState: 'FAILED',
                    eventName: 'COMMAND_ORPHANED',
                    owner: 'ClusterOrchestrator',
                    browserId: browserId,
                    metadata: { reason }
                });
            }).catch(() => {});
        }
    }

    /**
     * Returns the count of actively available browsers (Master + Slaves in Ready or Busy state).
     * @returns {number}
     */
    getActiveBrowserCount() {
        if (!this.registry) return 0;
        return this.registry.getAll().filter(b => b.state === 'Ready' || b.state === 'Busy').length;
    }

    /**
     * Dynamically activates an account by spawning a new slave browser and logging in.
     * @param {{ username: string, password: string }} account
     * @param {string} [explicitProxyUrl]
     * @returns {Promise<any>} The created browser state model
     */
    async activateAccount(account, explicitProxyUrl = null) {
        if (!account || !account.username || !account.password) {
            throw new Error('Account object with username and password is required');
        }

        const existing = this.registry.getAll().find(b => b.username === account.username);
        if (existing) {
            logger.info(`[ClusterOrchestrator] Account ${account.username} is already active on [${existing.id}].`);
            return existing;
        }

        const slaveId = `slave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const proxyUrl = explicitProxyUrl || this._allocateProxy();
        if (!proxyUrl && this.settings.Proxy?.proxy_failure_mode === 'strict') {
            throw new Error(`Cannot activate account ${account.username}: No proxy available in strict mode`);
        }

        logger.info(`[ClusterOrchestrator] Dynamically spawning slave browser [${slaveId}] for ${account.username}...`);
        await this.lifecycleManager.spawnBrowser(slaveId, 'slave', proxyUrl, account.username);
        await this.sessionManager.restoreOrLogin(slaveId, account.username, account.password);

        const slave = this.registry.get(slaveId);
        if (slave && slave.page) {
            await this.stateObserver.injectObservers(slave.id, slave.page);
        }

        if (this.bettingAuthorizationRegistry) {
            this.bettingAuthorizationRegistry.enable(slaveId);
        }

        logger.info(`[ClusterOrchestrator] Successfully activated dynamic slave [${slaveId}] for ${account.username}.`);
        return slave;
    }

    /**
     * Dynamically deactivates an account by closing its browser instance and removing it from the registry.
     * @param {string} accountIdOrUsername - Browser ID or account username
     * @returns {Promise<boolean>} True if deactivated
     */
    async deactivateAccount(accountIdOrUsername) {
        if (!accountIdOrUsername) {
            throw new Error('accountIdOrUsername is required');
        }

        const target = this.registry.getAll().find(b => b.id === accountIdOrUsername || b.username === accountIdOrUsername);
        if (!target) {
            logger.warn(`[ClusterOrchestrator] Cannot deactivate: browser [${accountIdOrUsername}] not found in registry.`);
            return false;
        }

        logger.info(`[ClusterOrchestrator] Deactivating browser [${target.id}] (${target.username})...`);
        if (this.bettingAuthorizationRegistry) {
            this.bettingAuthorizationRegistry.disable(target.id);
        }

        try {
            if (target.browser) {
                await target.browser.close();
            }
        } catch (err) {
            logger.warn(`[ClusterOrchestrator] Error closing browser [${target.id}]: ${err.message}`);
        } finally {
            this.registry.remove(target.id);
        }

        logger.info(`[ClusterOrchestrator] Browser [${target.id}] successfully deactivated.`);
        return true;
    }
}
