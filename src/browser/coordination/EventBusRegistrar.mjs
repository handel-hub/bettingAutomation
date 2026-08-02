import { logger } from '../../config.mjs';
import featureFlags from '../execution/locatorIntelligence/FeatureFlags.mjs';

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
        this.commandReceiver = deps.commandReceiver;
        this.healthMonitor = deps.healthMonitor;
        this.syncRecoveryActionExecutor = deps.syncRecoveryActionExecutor;
        this.simulator = deps.simulator;
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
            
            if (command.type === 'CLICK' || command.type === 'click') {
                this.navSync.recordClickTime(command.captureTime);
            }
            
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
        this.syncRecoveryActionExecutor.on('Command', routeFn);

        // Bridge: Simulator Success/Failure -> Registry Metadata
        this.simulator.on('ActionFailure', ({ id, error }) => {
            if (!featureFlags.isEnabled('V3_DECOUPLE_HEALTH_MONITOR')) {
                this.registry.updateState(id, 'Error');
            } else {
                logger.debug(`[EventBusRegistrar] V3_DECOUPLE_HEALTH_MONITOR enabled: preserving ONLINE/READY state for [${id}] on ActionFailure.`);
            }
        });
    }
}
