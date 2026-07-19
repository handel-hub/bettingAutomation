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

        let managerResult = await SynchronizationManager.awaitCapabilities(syncContext, capabilities);
        let elapsed = Date.now() - startTime;
        let recoveryAction = null;
        let diagnostics = null;

        if (SynchronizationManager.timeline) {
            SynchronizationManager.timeline.record({ type: 'BarrierEvaluated', satisfied: managerResult.satisfied, browserId });
        }

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

        if (managerResult.satisfied) {
            executionContext.addTrace('BarrierPassed');
            if (SynchronizationManager.timeline) SynchronizationManager.timeline.record({ type: 'BarrierPassed', browserId });
            return enrichTelemetry('PASSED');
        }

        if (Date.now() >= deadline) {
            executionContext.addTrace('BarrierTimeout');
            return enrichTelemetry('TIMEOUT');
        }

        const consistencyScore = managerResult.snapshot ? managerResult.snapshot.consistency : 0;
        if (consistencyScore < 30 && managerResult.snapshot) { 
            return enrichTelemetry('CONSISTENCY_TOO_LOW');
        }

        if (SynchronizationManager.recoveryCoordinator && managerResult.snapshot) {
            if (SynchronizationManager.timeline) SynchronizationManager.timeline.record({ type: 'RecoveryStarted', capability: managerResult.blockingCapability, browserId });
            const recoveryResult = await SynchronizationManager.recoveryCoordinator.recover(managerResult.snapshot, managerResult.blockingCapability);
            
            recoveryAction = recoveryResult.strategy;

            if (SynchronizationManager.telemetry) {
                SynchronizationManager.telemetry.recordRecovery(recoveryResult);
            }

            if (recoveryResult.status === 'ABORTED') {
                return enrichTelemetry('RECOVERING');
            }

            if (recoveryResult.status === 'SUCCESS' || recoveryResult.status === 'PARTIAL') {
                managerResult = await SynchronizationManager.awaitCapabilities(syncContext, capabilities);
                elapsed = Date.now() - startTime;
                if (managerResult.satisfied) {
                    executionContext.addTrace('BarrierPassedAfterRecovery');
                    if (SynchronizationManager.timeline) SynchronizationManager.timeline.record({ type: 'BarrierPassed', browserId });
                    return enrichTelemetry('PASSED');
                }
            }
        }

        executionContext.addTrace('BarrierFailed');
        return enrichTelemetry('FAILED');
    }
}
