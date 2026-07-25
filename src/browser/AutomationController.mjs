import { logger } from '../config.mjs';
import { CommandRouter } from './CommandRouter.mjs';
import { TargetResolver } from './coordination/TargetResolver.mjs';

import {
    BrowserLifecycleManager,
    SessionManager,
    NavigationSynchronizer,
    HealthMonitor,
    RecoveryManager,
    AccountLockManager,
    ClusterOrchestrator,
    EventBusRegistrar
} from './coordination/index.mjs';

import {
    CommandReceiver,
    ActionDispatcher,
    ActionSimulator,
    ExecutionScheduler,
    MacroEngine,
    WorkflowEngine
} from './execution/index.mjs';

import { SynchronizationManager } from './synchronization/SynchronizationManager.mjs';
import { SynchronizationCoordinator } from './synchronization/coordination/SynchronizationCoordinator.mjs';
import { ConsistencyEvaluator } from './synchronization/coordination/ConsistencyEvaluator.mjs';
import { ConsistencyPolicy } from './synchronization/coordination/ConsistencyPolicy.mjs';
import { RecoveryCoordinator } from './synchronization/coordination/RecoveryCoordinator.mjs';
import { RecoveryActionExecutor } from './synchronization/coordination/RecoveryActionExecutor.mjs';
import { SynchronizationTelemetry } from './synchronization/telemetry/SynchronizationTelemetry.mjs';
import { SynchronizationTimeline } from './synchronization/telemetry/SynchronizationTimeline.mjs';
import { BrowserStateRegistry } from './synchronization/BrowserStateRegistry.mjs';
import { CapabilityRegistry } from './synchronization/CapabilityRegistry.mjs';

export class AutomationController {
    constructor(settings, accounts, proxyManager, stealthEngine) {
        this.settings = settings;
        this.accounts = accounts;
        this.proxyManager = proxyManager;

        // --- Initialize Coordination Subsystem ---
        this.registry = new BrowserStateRegistry();
        this.capabilityRegistry = new CapabilityRegistry();
        this.syncManager = new SynchronizationManager(this.registry, this.capabilityRegistry);

        this.lifecycleManager = new BrowserLifecycleManager(this.registry, this.capabilityRegistry, settings, stealthEngine);
        this.sessionManager = new SessionManager(this.registry);
        this.navSync = new NavigationSynchronizer(this.registry);
        this.healthMonitor = new HealthMonitor(this.registry);

        // --- Initialize Execution Subsystem ---
        this.commandReceiver = new CommandReceiver(settings);
        this.simulator = new ActionSimulator();
        this.scheduler = new ExecutionScheduler(this.simulator, this.registry, this.syncManager);
        this.macroEngine = new MacroEngine(this.simulator, this.scheduler);
        this.actionDispatcher = new ActionDispatcher(settings, this.registry);
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

        // --- Initialize Synchronization Orchestration ---
        this.consistencyEvaluator = new ConsistencyEvaluator(ConsistencyPolicy.DEFAULT);
        this.syncCoordinator = new SynchronizationCoordinator(this.consistencyEvaluator, this.registry);
        this.syncRecoveryCoordinator = new RecoveryCoordinator(this.registry);
        this.syncTelemetry = new SynchronizationTelemetry();
        this.syncTimeline = new SynchronizationTimeline();
        this.syncRecoveryActionExecutor = new RecoveryActionExecutor(this.capabilityRegistry);
        
        this.syncManager.setCoordinator(this.syncCoordinator);
        this.syncManager.setRecoveryCoordinator(this.syncRecoveryCoordinator);
        this.syncManager.setRecoveryActionExecutor(this.syncRecoveryActionExecutor);
        this.syncManager.setTelemetry(this.syncTelemetry);
        this.syncManager.setTimeline(this.syncTimeline);

        this.eventBusRegistrar = new EventBusRegistrar({
            commandRouter: this.commandRouter,
            targetResolver: this.targetResolver,
            macroEngine: this.macroEngine,
            scheduler: this.scheduler,
            registry: this.registry,
            lockManager: this.lockManager,
            workflowEngine: this.workflowEngine,
            recoveryManager: this.recoveryManager,
            navSync: this.navSync,
            actionDispatcher: this.actionDispatcher,
            commandReceiver: this.commandReceiver,
            healthMonitor: this.healthMonitor,
            syncRecoveryActionExecutor: this.syncRecoveryActionExecutor,
            simulator: this.simulator
        });

        this.clusterOrchestrator = new ClusterOrchestrator({
            settings: this.settings,
            accounts: this.accounts,
            proxyManager: this.proxyManager,
            lifecycleManager: this.lifecycleManager,
            sessionManager: this.sessionManager,
            navSync: this.navSync,
            registry: this.registry,
            capabilityRegistry: this.capabilityRegistry,
            syncManager: this.syncManager,
            macroEngine: this.macroEngine,
            actionDispatcher: this.actionDispatcher,
            healthMonitor: this.healthMonitor,
            commandReceiver: this.commandReceiver,
            scheduler: this.scheduler
        });

        this.eventBusRegistrar.registerAll();
    }

    async start() {
        await this.clusterOrchestrator.start();
    }

    async stop() {
        await this.clusterOrchestrator.stop();
    }
}
