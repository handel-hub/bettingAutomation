import { RollingWindow } from './RollingWindow.mjs';

export class MetricsRegistry {
    constructor() {
        this.reset();
    }

    reset() {
        // Resolution Metrics
        this.resolution = {
            total: 0,
            success: 0,
            failed: 0,
            timeout: 0,
            latency: new RollingWindow(128),
            retries: new RollingWindow(128)
        };

        // Ranking Metrics
        this.ranking = {
            candidateCount: new RollingWindow(128),
            finalConfidence: new RollingWindow(128),
            ambiguityCount: new RollingWindow(128),
            corroborationCount: new RollingWindow(128)
        };

        // Strategy Metrics (Map of Strategy Name -> Counters)
        this.strategies = new Map();

        // Validation Metrics
        this.validation = {
            UNIQUE: 0,
            AMBIGUOUS: 0,
            NOT_VERIFIABLE: 0,
            MISSING: 0,
            INVALID: 0
        };

        // Phase 2: EID Metrics
        this.extraction = {
            eidTime: new RollingWindow(128)
        };

        // Phase 6: Batch Resolution Metrics
        this.batch = {
            evaluationTime: new RollingWindow(128),
            candidateCount: new RollingWindow(128),
            roundTrips: new RollingWindow(128)
        };

        // Phase 7: Disambiguation & Verification
        this.disambiguation = {
            triggered: 0,
            failed: 0
        };
        this.verification = {
            passed: 0,
            failed: 0,
            similarityScore: new RollingWindow(128)
        };

        // Phase 8: Confidence Gate Metrics
        this.confidence = {
            ACCEPT: 0,
            REJECT: 0,
            TENTATIVE: 0
        };

        // Phase 9: Recovery Hierarchy
        this.recovery = {
            L1_RETRY: 0,
            L2_WAIT: 0,
            L3_SKIP: 0,
            L4_RELOAD: 0
        };

        // Phase 11: Resolution Memory
        this.memory = {
            hits: 0,
            misses: 0,
            evictions: 0
        };

        // Telemetry-Driven Failure Localization (Lifecycle Trace Sink)
        this.lifecycleEvents = [];

        // Failure Metrics (Map of LF Code -> Count)
        this.failures = new Map();

        // Shadow Mode Comparison Metrics
        this.shadowMode = {
            total: 0,
            matches: 0,
            mismatches: 0
        };

        // Execution Metrics (Hooks for ActionSimulator)
        this.execution = {
            total: 0,
            retries: new RollingWindow(128),
            resolverCycles: new RollingWindow(128),
            candidateExhaustion: new RollingWindow(128),
            confidenceDecay: new RollingWindow(128),
            epochSkips: 0
        };

        // Epoch Synchronization Metrics
        this.epochSync = {
            injectionSuccess: 0,
            injectionFailure: 0,
            injectionRetry: 0,
            mismatchDetected: 0,
            skippedStale: 0,
            skippedTimeout: 0,
            proceeded: 0,
            waited: 0,
            ipcReceived: 0,
            ipcLost: 0,
            ipcDuplicatesDropped: 0,
            ipcOutOfOrder: 0,
            spaNavigationDetected: 0,
            ipcDeliveryLatency: new RollingWindow(128),
            injectionLatency: new RollingWindow(128),
            epochWaitDuration: new RollingWindow(128),
            epochDrift: new RollingWindow(128)
        };
    }

    _getOrCreateStrategyRecord(strategyName) {
        if (!this.strategies.has(strategyName)) {
            this.strategies.set(strategyName, { success: 0, failed: 0 });
        }
        return this.strategies.get(strategyName);
    }

    recordStrategyResult(strategyName, success) {
        if (!strategyName) return;
        const record = this._getOrCreateStrategyRecord(strategyName);
        if (success) {
            record.success++;
        } else {
            record.failed++;
        }
    }

    recordFailureCode(code) {
        if (!code) return;
        const count = this.failures.get(code) || 0;
        this.failures.set(code, count + 1);
    }

    snapshot() {
        return {
            timestamp: Date.now(),
            extraction: {
                averageEidTime: this.extraction.eidTime.average
            },
            batch: {
                averageEvaluationTime: this.batch.evaluationTime.average,
                averageCandidateCount: this.batch.candidateCount.average,
                averageRoundTrips: this.batch.roundTrips.average
            },
            disambiguation: { ...this.disambiguation },
            verification: {
                passed: this.verification.passed,
                failed: this.verification.failed,
                averageSimilarityScore: this.verification.similarityScore.average
            },
            resolution: {
                total: this.resolution.total,
                success: this.resolution.success,
                failed: this.resolution.failed,
                timeout: this.resolution.timeout,
                averageLatency: this.resolution.latency.average,
                averageRetries: this.resolution.retries.average
            },
            ranking: {
                averageCandidateCount: this.ranking.candidateCount.average,
                averageFinalConfidence: this.ranking.finalConfidence.average,
                averageAmbiguityCount: this.ranking.ambiguityCount.average,
                averageCorroborationCount: this.ranking.corroborationCount.average
            },
            strategies: Object.fromEntries(this.strategies),
            validation: { ...this.validation },
            confidence: { ...this.confidence },
            recovery: { ...this.recovery },
            memory: { ...this.memory },
            failures: Object.fromEntries(this.failures),
            shadowMode: { ...this.shadowMode },
            execution: {
                total: this.execution.total,
                averageRetries: this.execution.retries.average,
                averageResolverCycles: this.execution.resolverCycles.average,
                averageCandidateExhaustion: this.execution.candidateExhaustion.average,
                averageConfidenceDecay: this.execution.confidenceDecay.average,
                epochSkips: this.execution.epochSkips
            },
            epochSync: {
                injectionSuccess: this.epochSync.injectionSuccess,
                injectionFailure: this.epochSync.injectionFailure,
                injectionRetry: this.epochSync.injectionRetry,
                mismatchDetected: this.epochSync.mismatchDetected,
                skippedStale: this.epochSync.skippedStale,
                skippedTimeout: this.epochSync.skippedTimeout,
                proceeded: this.epochSync.proceeded,
                waited: this.epochSync.waited,
                ipcReceived: this.epochSync.ipcReceived,
                ipcLost: this.epochSync.ipcLost,
                ipcDuplicatesDropped: this.epochSync.ipcDuplicatesDropped,
                ipcOutOfOrder: this.epochSync.ipcOutOfOrder,
                spaNavigationDetected: this.epochSync.spaNavigationDetected,
                averageIpcDeliveryLatency: this.epochSync.ipcDeliveryLatency.average,
                averageInjectionLatency: this.epochSync.injectionLatency.average,
                averageEpochWaitDuration: this.epochSync.epochWaitDuration.average,
                averageEpochDrift: this.epochSync.epochDrift.average
            },
            lifecycle: {
                totalEvents: this.lifecycleEvents.length,
                recentEvents: this.lifecycleEvents.slice(-20)
            }
        };
    }
}
