import { SynchronizationManager } from './SynchronizationManager.mjs';
import { SynchronizationDiagnostics } from './telemetry/SynchronizationDiagnostics.mjs';

/**
 * A stateless execution gate that coordinates with the SynchronizationManager.
 */
export class SynchronizationBarrier {
    static async wait(syncContext) {
        const { browserId, profile, context: executionContext, deadline } = syncContext;
        const capabilities = profile.level; 

        if (!capabilities || capabilities.length === 0) {
            return { status: 'PASSED', satisfiedCapabilities: [], missingCapabilities: [], blockingCapability: null, elapsed: 0, providerTelemetry: [] };
        }

        const startTime = Date.now();
        executionContext.addTrace('BarrierWaitStarted');

        let recoveryAttempts = 0;
        const maxRecoveryAttempts = syncContext.context?.maxRecoveryAttempts ?? 2;
        
        let managerResult;
        let recoveryAction = null;
        let elapsed = 0;
        let diagnostics = null;

        const enrichTelemetry = (resultStatus) => {
            const snapshot = managerResult.snapshot;
            const consistencyScore = snapshot ? snapshot.consistency : 0;
            
            if (SynchronizationManager.timeline && snapshot) {
                diagnostics = SynchronizationDiagnostics.generateReport(snapshot, SynchronizationManager.timeline);
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

            if (SynchronizationManager.telemetry) {
                SynchronizationManager.telemetry.recordBarrier(elapsed, resultStatus === 'PASSED');
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
            managerResult = await SynchronizationManager.awaitCapabilities(syncContext, capabilities);
            elapsed = Date.now() - startTime;
            
            if (SynchronizationManager.timeline) {
                SynchronizationManager.timeline.record({ type: 'BarrierEvaluated', satisfied: managerResult.satisfied, browserId });
            }

            // 2. Capability Result Evaluation
            if (managerResult.satisfied) {
                executionContext.addTrace(recoveryAttempts > 0 ? 'BarrierPassedAfterRecovery' : 'BarrierPassed');
                if (SynchronizationManager.timeline) SynchronizationManager.timeline.record({ type: 'BarrierPassed', browserId });
                return enrichTelemetry('PASSED');
            }

            // 3. Recoverable?
            const consistencyScore = managerResult.snapshot ? managerResult.snapshot.consistency : 0;
            if (consistencyScore < 30 && managerResult.snapshot) { 
                return enrichTelemetry('CONSISTENCY_TOO_LOW');
            }

            if (!SynchronizationManager.recoveryCoordinator || !managerResult.snapshot || recoveryAttempts >= maxRecoveryAttempts) {
                break;
            }

            // 4. Recovery Execution
            recoveryAttempts++;
            if (SynchronizationManager.timeline) SynchronizationManager.timeline.record({ type: 'RecoveryStarted', capability: managerResult.blockingCapability, browserId });
            
            const recoveryPlan = await SynchronizationManager.recoveryCoordinator.recover(managerResult.snapshot, managerResult.blockingCapability);
            recoveryAction = recoveryPlan.strategy;

            if (SynchronizationManager.telemetry) {
                SynchronizationManager.telemetry.recordRecovery(recoveryPlan);
            }

            if (SynchronizationManager.recoveryActionExecutor) {
                await SynchronizationManager.recoveryActionExecutor.execute(recoveryPlan, syncContext);
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
