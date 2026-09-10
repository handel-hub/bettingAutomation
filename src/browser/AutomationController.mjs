import { logger } from '../utils/logger.mjs';
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
import { ReconciliationDaemon } from './coordination/ReconciliationDaemon.mjs';
import { RunLedger } from './coordination/wal/RunLedger.mjs';
import { RunOrchestrator } from './coordination/RunOrchestrator.mjs';
import { PassiveShadowDaemon } from './coordination/PassiveShadowDaemon.mjs';
import { TriggerRouter } from './execution/TriggerRouter.mjs';
import { MemoryPolicyProvider } from '../worker/MemoryPolicyProvider.mjs';
import { StealthEngine } from '../detection/stealth.mjs';
import { ExecutionMessageType } from '../worker/protocol.mjs';


import {
    ActionDispatcher,
    ActionSimulator,
    ExecutionScheduler,
    MacroEngine,
    WorkflowEngine
} from './execution/index.mjs';

import { SynchronizationManager } from './synchronization/SynchronizationManager.mjs';
import { SynchronizationCoordinator } from './synchronization/coordination/SynchronizationCoordinator.mjs';
import { BettingAuthorizationRegistry } from './execution/BettingAuthorizationRegistry.mjs';
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
    constructor(settings, accounts, proxies, policy, ipcIngress) {
        this.settings = settings;
        this.accounts = accounts;
        
        // --- Stealth moved from Launcher to Execution ---
        this.stealthEngine = new StealthEngine(settings);

        // --- Initialize Coordination Subsystem ---
        this.registry = new BrowserStateRegistry();
        
        attachBrowserLifecycleAdapter(this.registry);
        
        this.capabilityRegistry = new CapabilityRegistry();
        this.syncManager = new SynchronizationManager(this.registry, this.capabilityRegistry);

        this.lifecycleManager = new BrowserLifecycleManager(this.registry, this.capabilityRegistry, settings, this.stealthEngine);
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
        this.commandReceiver = ipcIngress; // IpcIngress now acts as CommandReceiver
        this.simulator = new ActionSimulator();
        this.scheduler = new ExecutionScheduler(this.simulator, this.registry, this.syncManager);
        this.macroEngine = new MacroEngine(this.simulator, this.scheduler);
        this.lockManager = new AccountLockManager();

        // --- P1 Fix: Initialize Policies and Orchestrators FIRST ---
        this.policyManager = new MemoryPolicyProvider(policy);
        this.commandRouter = new CommandRouter();
        this.runLedger = new RunLedger();
        
        this.bettingAuthorizationRegistry = new BettingAuthorizationRegistry();

        this.runOrchestrator = new RunOrchestrator(this.runLedger, this.registry, this.commandRouter, this.bettingAuthorizationRegistry);

        this.workflowEngine = new WorkflowEngine({
            lockManager: this.lockManager,
            registry: this.registry,
            policyManager: this.policyManager,
            simulator: this.simulator,
            runOrchestrator: this.runOrchestrator,
            bettingAuthorizationRegistry: this.bettingAuthorizationRegistry
        });

        const credentialsMap = new Map(accounts.map(a => [a.username, a.password]));
        this.cdpMutex = new CDPMutex();
        
        this.recoveryManager = new RecoveryManager(
            this.registry,
            this.lifecycleManager,
            this.sessionManager,
            credentialsMap,
            { cdpMutex: this.cdpMutex }
        );

        this.targetResolver = new TargetResolver(this.registry, this.lockManager);

        // --- Initialize Autonomous Pricing Execution Plane ---
        this.sequenceMap = new Map();
        this.platformApiAdapter = { getRecentHistory: async () => [] };

        this.authorizationGateway = new AuthorizationGateway(this.sequenceMap, this.policyManager, this.commandRouter);
        
        // --- PHASE 1 WIRING ---
        this.triggerRouter = new TriggerRouter(this.runOrchestrator, this.workflowEngine);
        this.simulator.runOrchestrator = this.runOrchestrator;
        // ---------------------------
        
        this.reconciliationDaemon = new ReconciliationDaemon(this.sequenceMap, this.platformApiAdapter);
        this.reconciliationDaemon.start();
        
        // --- CONTROL PLANE HOOK ---
        this.commandRouter.register('Control', 'SET_BETTING_AUTHORIZATION', async (command) => {
            const { targetBrowserId, isEnabled } = command.payload || {};
            if (targetBrowserId) {
                if (isEnabled) {
                    this.bettingAuthorizationRegistry.enable(targetBrowserId);
                } else {
                    this.bettingAuthorizationRegistry.disable(targetBrowserId);
                }
            }
        });

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
            convergenceEngine: this.convergenceEngine,
            triggerRouter: this.triggerRouter,
            runOrchestrator: this.runOrchestrator
        });

        // --- Initialize Phase 1 Passive Shadow Daemon ---
        this.passiveShadowDaemon = new PassiveShadowDaemon(
            this.runOrchestrator,
            this.simulator,
            this.policyManager,
            this.registry
        );
        this.triggerRouter.passiveShadowDaemon = this.passiveShadowDaemon;

        this.clusterOrchestrator = new ClusterOrchestrator({
            settings: this.settings,
            accounts: this.accounts,
            proxies: proxies,
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
            stateObserver: this.stateObserver,
            passiveShadowDaemon: this.passiveShadowDaemon,
            bettingAuthorizationRegistry: this.bettingAuthorizationRegistry
        });

        this.ipcIngress = ipcIngress;
        if (this.ipcIngress) {
            this.workflowEngine.on('OperationComplete', (data) => {
                this.ipcIngress.sendReply(ExecutionMessageType.OPERATION_RESULT, {
                    operationId: data.operationId,
                    status: data.status,
                    metrics: data.metrics,
                    error: data.error
                }, data.traceId);
            });
        }

        this.eventBusRegistrar.registerAll();
    }

    async start() {
        // By default, enable betting authorization for all provisioned browsers
        this.bettingAuthorizationRegistry.enable('master');
        for (let i = 0; i < this.accounts.length - 1; i++) {
            this.bettingAuthorizationRegistry.enable(`slave_${i}`);
        }
        await this.clusterOrchestrator.start();
    }

    async stop() {
        await this.clusterOrchestrator.stop();
    }

    activateAccount(account, proxyUrl) {
        return this.clusterOrchestrator.activateAccount(account, proxyUrl);
    }

    deactivateAccount(accountIdOrUsername) {
        return this.clusterOrchestrator.deactivateAccount(accountIdOrUsername);
    }

    getActiveBrowserCount() {
        return this.clusterOrchestrator.getActiveBrowserCount();
    }
}
