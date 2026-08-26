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
    EventBusRegistrar,
    StateObserver,
    ConvergenceEngine,
    VerificationEngine
} from './coordination/index.mjs';

import { AuthorizationGateway } from './coordination/AuthorizationGateway.mjs';
import { SequenceOrchestrator } from './coordination/SequenceOrchestrator.mjs';
import { ReconciliationDaemon } from './coordination/ReconciliationDaemon.mjs';


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
import { CDPMutex } from './synchronization/coordination/CDPMutex.mjs';
import { attachSyncTelemetryAdapter } from '../rkp/integration/SyncTelemetryAdapter.mjs';
import { attachBrowserLifecycleAdapter } from '../rkp/integration/BrowserLifecycleAdapter.mjs';

export class AutomationController {
    constructor(settings, accounts, proxyManager, stealthEngine) {
        this.settings = settings;
        this.accounts = accounts;
        this.proxyManager = proxyManager;

        // --- Initialize Coordination Subsystem ---
        this.registry = new BrowserStateRegistry();
        
        attachBrowserLifecycleAdapter(this.registry);
        
        this.capabilityRegistry = new CapabilityRegistry();
        this.syncManager = new SynchronizationManager(this.registry, this.capabilityRegistry);

        this.lifecycleManager = new BrowserLifecycleManager(this.registry, this.capabilityRegistry, settings, stealthEngine);
        this.sessionManager = new SessionManager(this.registry);
        this.actionDispatcher = new ActionDispatcher(settings, this.registry);
        this.navSync = new NavigationSynchronizer(this.registry, this.actionDispatcher);
        this.healthMonitor = new HealthMonitor(this.registry);
        this.stateObserver = new StateObserver(this.registry);
        this.verificationEngine = new VerificationEngine();
        this.convergenceEngine = new ConvergenceEngine(this.verificationEngine);

        // Wire StateObserver to ConvergenceEngine
        this.stateObserver.on('StateObservation', (obs) => {
            this.convergenceEngine.processObservation(obs);
        });

        this.convergenceEngine.on('ConvergenceDiverged', (evt) => {
            logger.warn(`[AutomationController] Slave ${evt.slaveId} diverged on command ${evt.commandId}. Reason: ${evt.reason}. Issuing corrective navigation.`);
            if (this.recoveryManager && evt.expectedUrl) {
                this.recoveryManager.initiateCorrectiveNavigation(evt.slaveId, evt.expectedUrl);
            }
        });

        // --- Initialize Execution Subsystem ---
        this.commandReceiver = new CommandReceiver(settings);
        this.simulator = new ActionSimulator();
        this.scheduler = new ExecutionScheduler(this.simulator, this.registry, this.syncManager);
        this.macroEngine = new MacroEngine(this.simulator, this.scheduler);
        this.lockManager = new AccountLockManager();
        this.workflowEngine = new WorkflowEngine(this.lockManager, this.registry);

        const credentialsMap = new Map(accounts.map(a => [a.username, a.password]));
        this.cdpMutex = new CDPMutex();
        
        this.recoveryManager = new RecoveryManager(
            this.registry,
            this.lifecycleManager,
            this.sessionManager,
            credentialsMap,
            { cdpMutex: this.cdpMutex }
        );

        this.commandRouter = new CommandRouter();
        this.targetResolver = new TargetResolver(this.registry, this.lockManager);

        // --- Initialize Autonomous Pricing Execution Plane ---
        this.sequenceMap = new Map();
        // Stub PolicyManager and API Adapter for the architectural baseline
        this.policyManager = {
            getPolicy: (id) => ({
                id, version: 1, targetProfit: 100000, maxStake: 500000, minStake: 10000,
                minAcceptableProfit: 10000, resolutionStrategy: 'CLAMP', behavioralFunctions: ['PREFER_ROUND'],
                rebetTrigger: 'ON_WIN', maxRebetCount: 3
            })
        };
        this.platformApiAdapter = { getRecentHistory: async () => [] };

        this.authorizationGateway = new AuthorizationGateway(this.sequenceMap, this.policyManager, this.commandRouter);
        this.sequenceOrchestrator = new SequenceOrchestrator(this.sequenceMap, this.policyManager, this.commandRouter);
        this.reconciliationDaemon = new ReconciliationDaemon(this.sequenceMap, this.platformApiAdapter);
        this.reconciliationDaemon.start();

        // --- Initialize Synchronization Orchestration ---
        this.consistencyEvaluator = new ConsistencyEvaluator(ConsistencyPolicy.DEFAULT);
        this.syncCoordinator = new SynchronizationCoordinator(this.consistencyEvaluator, this.registry, this.cdpMutex);
        this.syncRecoveryCoordinator = new RecoveryCoordinator(this.registry);
        this.syncTelemetry = new SynchronizationTelemetry();
        this.syncTimeline = new SynchronizationTimeline();
        this.syncRecoveryActionExecutor = new RecoveryActionExecutor(this.capabilityRegistry);
        
        this.syncManager.setCoordinator(this.syncCoordinator);
        this.syncManager.setRecoveryCoordinator(this.syncRecoveryCoordinator);
        this.syncManager.setRecoveryActionExecutor(this.syncRecoveryActionExecutor);
        this.syncManager.setTelemetry(this.syncTelemetry);
        this.syncManager.setTimeline(this.syncTimeline);

        this.registry.on('WORKER_BROKEN', () => {
            logger.error('[AutomationController] FATAL: Worker Broken. Freezing SynchronizationTimeline to preserve forensic state.');
            this.syncTimeline.freeze();
        });

        attachSyncTelemetryAdapter(this.syncManager);

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
            stealthEngine: this.stealthEngine,
            capabilityRegistry: this.capabilityRegistry,
            lifecycleManager: this.lifecycleManager,
            simulator: this.simulator,
            stateObserver: this.stateObserver,
            convergenceEngine: this.convergenceEngine
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
            scheduler: this.scheduler,
            stateObserver: this.stateObserver
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
