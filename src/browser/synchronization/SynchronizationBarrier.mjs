import { SynchronizationDiagnostics } from './telemetry/SynchronizationDiagnostics.mjs';
import { logger } from '../../config.mjs';
import { CapabilityPhases } from './SynchronizationLevel.mjs';

/**
 * A stateless execution gate that coordinates with the SynchronizationManager.
 */
export class SynchronizationBarrier {
    static async wait(syncContext) {
        const { browserId, profile, context: executionContext, deadline, syncManager, phase } = syncContext;
        let capabilities = profile.level || [];

        if (phase === 'PRE') {
            capabilities = capabilities.filter(c => CapabilityPhases.PRE_EXECUTION.includes(c));
        } else if (phase === 'POST') {
            capabilities = capabilities.filter(c => CapabilityPhases.POST_EXECUTION.includes(c));
        }

        if (!capabilities || capabilities.length === 0) {
            return { status: 'PASSED', satisfiedCapabilities: [], missingCapabilities: [], blockingCapability: null, elapsed: 0, providerTelemetry: [] };
        }

        const startTime = Date.now();
        executionContext.addTrace('BarrierWaitStarted');
        
        try {
            if (executionContext && executionContext.command) {
                const c = executionContext.command;
                import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: c.id || c.commandId,
                        traceId: c.traceId,
                        interactionId: c.interactionId || null,
                        prevState: 'EXECUTING', // or ASSIGNED depending on prior step
                        newState: 'WAITING_BARRIER',
                        eventName: 'BARRIER_ENTERED',
                        owner: 'SynchronizationBarrier',
                        browserId: browserId,
                        metadata: { expectedCapabilities: capabilities }
                    });
                }).catch(() => {});
            }
        } catch (e) {
            logger.warn(`[SynchronizationBarrier] WAITING_BARRIER Telemetry emission failed: ${e.message}`);
        }

        let recoveryAttempts = 0;
        const maxRecoveryAttempts = syncContext.context?.maxRecoveryAttempts ?? 2;
        
        let managerResult;
        let recoveryAction = null;
        let elapsed = 0;
        let diagnostics = null;

        const enrichTelemetry = (resultStatus) => {
            const snapshot = managerResult.snapshot;
            const consistencyScore = snapshot ? snapshot.consistency : 0;
            
            if (syncManager.timeline && snapshot) {
                diagnostics = SynchronizationDiagnostics.generateReport(snapshot, syncManager.timeline);
            }

            let failureReason = null;
            if (managerResult.blockingCapability) {
                const blockingTel = managerResult.providerTelemetry.find(t => t.capability === managerResult.blockingCapability);
                if (blockingTel && blockingTel.error) {
                    failureReason = blockingTel.error.message;
                } else if (blockingTel && blockingTel.reason) {
                    failureReason = blockingTel.reason;
                }
            }

            if (syncManager.telemetry) {
                syncManager.telemetry.recordBarrier(elapsed, resultStatus === 'PASSED');
            }

            try {
                if (executionContext && executionContext.command) {
                    const c = executionContext.command;
                    let newState = 'UNKNOWN';
                    let eventName = 'UNKNOWN';
                    if (resultStatus === 'PASSED') { newState = 'BARRIER_PASSED'; eventName = 'BARRIER_PASSED'; }
                    else if (resultStatus === 'TIMEOUT') { newState = 'BARRIER_TIMEOUT'; eventName = 'BARRIER_TIMEOUT'; }
                    else if (resultStatus === 'RECOVERING') { newState = 'RECOVERING'; eventName = 'BARRIER_RECOVERING'; }
                    else { newState = 'BARRIER_FAILED'; eventName = 'BARRIER_FAILED'; }
                    
                    import('../telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                        observabilityCollector.emitTransition({
                            commandId: c.id || c.commandId,
                            traceId: c.traceId,
                            interactionId: c.interactionId || null,
                            prevState: 'WAITING_BARRIER',
                            newState: newState,
                            eventName: eventName,
                            owner: 'SynchronizationBarrier',
                            browserId: browserId,
                            metadata: { elapsed, blockingCapability: managerResult.blockingCapability }
                        });
                    }).catch(() => {});
                }
            } catch (e) {
                // strict try/catch to prevent deadlocks
                logger.warn(`[SynchronizationBarrier] Telemetry emission failed: ${e.message}`);
            }

            return {
                status: resultStatus,
                consistencyScore,
                blockingCapability: managerResult.blockingCapability,
                recoveryAction,
                elapsed,
                diagnostics,
                satisfiedCapabilities: managerResult.satisfiedCapabilities,
                missingCapabilities: managerResult.missingCapabilities,
                providerTelemetry: managerResult.providerTelemetry,
                failureReason
            };
        };

        // 1. Evaluate & Re-evaluate Loop
        while (true) {
            managerResult = await syncManager.awaitCapabilities(syncContext, capabilities);
            elapsed = Date.now() - startTime;
            
            if (syncManager.timeline) {
                syncManager.timeline.record({ type: 'BarrierEvaluated', satisfied: managerResult.satisfied, browserId });
            }

            // 2. Capability Result Evaluation
            if (managerResult.satisfied) {
                executionContext.addTrace(recoveryAttempts > 0 ? 'BarrierPassedAfterRecovery' : 'BarrierPassed');
                if (syncManager.timeline) syncManager.timeline.record({ type: 'BarrierPassed', browserId });
                return enrichTelemetry('PASSED');
            }

            // 3. Recoverable?
            const consistencyScore = managerResult.snapshot ? managerResult.snapshot.consistency : 0;
            if (consistencyScore < 30 && managerResult.snapshot) { 
                return enrichTelemetry('CONSISTENCY_TOO_LOW');
            }

            if (!syncManager.recoveryCoordinator || !managerResult.snapshot || recoveryAttempts >= maxRecoveryAttempts) {
                break;
            }

            // 4. Recovery Execution
            recoveryAttempts++;
            if (syncManager.timeline) syncManager.timeline.record({ type: 'RecoveryStarted', capability: managerResult.blockingCapability, browserId });
            
            const recoveryPlan = await syncManager.recoveryCoordinator.recover(managerResult.snapshot, managerResult.blockingCapability);
            recoveryAction = recoveryPlan.strategy;

            if (syncManager.telemetry) {
                syncManager.telemetry.recordRecovery(recoveryPlan);
            }

            if (syncManager.recoveryActionExecutor) {
                await syncManager.recoveryActionExecutor.execute(recoveryPlan, syncContext);
            }

            if (recoveryPlan.strategy === 'PAGE_RELOAD' || recoveryPlan.strategy === 'BROWSER_RESTART') {
                return enrichTelemetry('RECOVERING');
            }
        }

        // 6. Timeout Evaluation
        if (Date.now() >= deadline) {
            executionContext.addTrace('BarrierTimeout');
            return enrichTelemetry('TIMEOUT');
        }

        executionContext.addTrace('BarrierFailed');
        return enrichTelemetry('FAILED');
    }
}
