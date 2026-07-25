import { MetricsRegistry } from './MetricsRegistry.mjs';
import featureFlags from '../FeatureFlags.mjs';

class TelemetryCollectorImpl {
    constructor() {
        this.registry = new MetricsRegistry();
    }

    /**
     * Resets all accumulated telemetry.
     */
    reset() {
        this.registry.reset();
    }

    /**
     * Returns an immutable snapshot of current metrics.
     */
    snapshot() {
        // Since snapshot returns a deeply cloned/mapped structure, it's safe to return directly.
        return this.registry.snapshot();
    }

    /**
     * Records telemetry from the RankingEngine.
     * @param {RankingResult} rankingResult
     */
    recordRanking(rankingResult) {
        try {
            if (!rankingResult) return;
            const candidates = rankingResult.candidates || [];
            this.registry.ranking.candidateCount.push(candidates.length);
            
            let totalConf = 0, ambiguityCount = 0, corroborationCount = 0;
            
            for (const c of candidates) {
                totalConf += c.ranking?.finalScore || 0;
                // These are heuristics, we assume the scores exist inside the candidate metadata
                if (c.ranking?.breakdown?.corroborationScore > 0) corroborationCount++;
            }
            
            if (candidates.length > 0) {
                this.registry.ranking.finalConfidence.push(totalConf / candidates.length);
            }
            this.registry.ranking.corroborationCount.push(corroborationCount);
        } catch (e) {
            // Passive - ignore errors
        }
    }

    /**
     * Records telemetry from the CandidateValidator.
     * @param {string} status e.g., UNIQUE, AMBIGUOUS, NOT_VERIFIABLE
     */
    recordValidation(status) {
        try {
            if (featureFlags.isEnabled('LI_REMOVE_VALIDATOR')) return;
            if (this.registry.validation[status] !== undefined) {
                this.registry.validation[status]++;
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry from the LocatorResolver.
     * @param {ResolutionResult} resolutionResult
     */
    recordResolution(resolutionResult) {
        try {
            if (!resolutionResult) return;
            
            this.registry.resolution.total++;
            this.registry.resolution.latency.push(resolutionResult.duration || 0);
            
            if (resolutionResult.success) {
                this.registry.resolution.success++;
                this.registry.recordStrategyResult(resolutionResult.winningStrategy, true);
                
                // Track execution attempts before finding success
                let resolutionAttempts = 0;
                if (resolutionResult.telemetry && resolutionResult.telemetry.length > 0) {
                     for (const t of resolutionResult.telemetry) {
                          resolutionAttempts += t.attempts || 0;
                     }
                }
                this.registry.resolution.retries.push(resolutionAttempts);
                
            } else {
                this.registry.resolution.failed++;
                if (resolutionResult.failureReason && resolutionResult.failureReason.includes('LF-504')) {
                    this.registry.resolution.timeout++;
                    this.registry.recordFailureCode('LF-504');
                } else if (resolutionResult.failureReason && resolutionResult.failureReason.includes('LF-505')) {
                    this.registry.recordFailureCode('LF-505');
                } else {
                    this.registry.recordFailureCode('UNKNOWN_FAILURE');
                }
            }
            
            // Record strategy failures
            if (resolutionResult.telemetry) {
                for (const ctx of resolutionResult.telemetry) {
                    // ctx is either a stripped object `{ rank, attempts, state }` or full `ResolutionContext`
                    // We only count strategies that were exhausted or had terminal failures as failed.
                    if (ctx.state === 'EXHAUSTED' || ctx.state === 'TERMINAL_FAILURE') {
                        // We need the strategy name, full context has candidate.strategy.
                        const strategyName = ctx.candidate?.strategy || ctx.strategy;
                        if (strategyName) {
                            this.registry.recordStrategyResult(strategyName, false);
                        }
                        
                        // Count LF codes from failures
                        if (ctx.lastFailure?.code) {
                            this.registry.recordFailureCode(ctx.lastFailure.code);
                        } else if (ctx.failureHistory && ctx.failureHistory.length > 0) {
                            const last = ctx.failureHistory[ctx.failureHistory.length - 1];
                            if (last.code) this.registry.recordFailureCode(last.code);
                        }
                    }
                }
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry from the ActionSimulator.
     */
    recordExecution() {
        // Placeholder for future auditing
        try {
            this.registry.execution.total++;
        } catch (e) {}
    }

    /**
     * Records telemetry from EID Extraction.
     */
    recordEIDExtraction(durationMs) {
        try {
            if (typeof durationMs === 'number') {
                this.registry.extraction.eidTime.push(durationMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from BatchResolver.
     */
    recordBatchResolution(durationMs, candidateCount, roundTrips = 1) {
        try {
            if (typeof durationMs === 'number') this.registry.batch.evaluationTime.push(durationMs);
            if (typeof candidateCount === 'number') this.registry.batch.candidateCount.push(candidateCount);
            if (typeof roundTrips === 'number') this.registry.batch.roundTrips.push(roundTrips);
        } catch (e) {}
    }

    /**
     * Records telemetry from DisambiguationEngine.
     */
    recordDisambiguation(success) {
        try {
            if (success) {
                this.registry.disambiguation.triggered++;
            } else {
                this.registry.disambiguation.failed++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from VerificationEngine.
     */
    recordVerification(success, similarityScore = 0) {
        try {
            if (success) {
                this.registry.verification.passed++;
            } else {
                this.registry.verification.failed++;
            }
            if (typeof similarityScore === 'number') {
                this.registry.verification.similarityScore.push(similarityScore);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from RecoveryOrchestrator.
     */
    recordRecovery(level) {
        try {
            const levelKey = `L${level}`;
            const keyMap = { 'L1': 'L1_RETRY', 'L2': 'L2_WAIT', 'L3': 'L3_SKIP', 'L4': 'L4_RELOAD' };
            const mapped = keyMap[levelKey];
            if (mapped && this.registry.recovery[mapped] !== undefined) {
                this.registry.recovery[mapped]++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from ResolutionMemory.
     */
    recordMemory(hit) {
        try {
            if (hit) {
                this.registry.memory.hits++;
            } else {
                this.registry.memory.misses++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from StaleEpoch aborts.
     */
    recordEpochSkip() {
        try {
            this.registry.execution.epochSkips++;
        } catch (e) {}
    }

    /**
     * Records telemetry from the ConfidenceGate.
     * @param {object} decision - ConfidenceDecision object
     */
    recordConfidenceGateDecision(decision) {
        try {
            if (!decision || !decision.decision) return;
            if (this.registry.confidence && this.registry.confidence[decision.decision] !== undefined) {
                this.registry.confidence[decision.decision]++;
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry for epoch injection attempts.
     * @param {boolean} success
     * @param {number} [latencyMs]
     */
    recordEpochInjection(success, latencyMs) {
        try {
            if (success) {
                this.registry.epochSync.injectionSuccess++;
            } else {
                this.registry.epochSync.injectionFailure++;
            }
            if (typeof latencyMs === 'number' && !isNaN(latencyMs)) {
                this.registry.epochSync.injectionLatency.push(latencyMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for epoch injection retries.
     */
    recordEpochInjectionRetry() {
        try {
            this.registry.epochSync.injectionRetry++;
        } catch (e) {}
    }

    /**
     * Records telemetry when a mismatch between client and server epoch is detected.
     * @param {number} clientEpoch
     * @param {number} serverEpoch
     */
    recordEpochMismatch(clientEpoch, serverEpoch) {
        try {
            this.registry.epochSync.mismatchDetected++;
            if (typeof clientEpoch === 'number' && typeof serverEpoch === 'number') {
                this.registry.epochSync.epochDrift.push(Math.abs(clientEpoch - serverEpoch));
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for epoch validation decisions.
     * @param {string|object} decision - Decision string ('PROCEED', 'SKIP', 'WAIT') or decision object
     * @param {number} [waitDurationMs]
     * @param {string} [reason]
     */
    recordEpochDecision(decision, waitDurationMs, reason) {
        try {
            const decStr = typeof decision === 'object' ? decision?.decision : decision;
            const resStr = typeof decision === 'object' ? decision?.reason : reason;

            if (decStr === 'PROCEED') {
                this.registry.epochSync.proceeded++;
            } else if (decStr === 'WAIT') {
                this.registry.epochSync.waited++;
            } else if (decStr === 'SKIP') {
                if (resStr && (resStr.includes('within') || resStr.includes('timeout') || resStr.includes('failed to navigate'))) {
                    this.registry.epochSync.skippedTimeout++;
                } else {
                    this.registry.epochSync.skippedStale++;
                }
            }

            if (typeof waitDurationMs === 'number' && !isNaN(waitDurationMs) && waitDurationMs > 0) {
                this.registry.epochSync.epochWaitDuration.push(waitDurationMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for IPC message delivery.
     * @param {number} [latencyMs]
     */
    recordIpcDelivery(latencyMs) {
        try {
            this.registry.epochSync.ipcReceived++;
            if (typeof latencyMs === 'number' && !isNaN(latencyMs)) {
                this.registry.epochSync.ipcDeliveryLatency.push(latencyMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for lost IPC messages.
     */
    recordIpcLost() {
        try {
            this.registry.epochSync.ipcLost++;
        } catch (e) {}
    }

    /**
     * Records telemetry for dropped duplicate IPC messages.
     */
    recordIpcDuplicate() {
        try {
            this.registry.epochSync.ipcDuplicatesDropped++;
        } catch (e) {}
    }

    /**
     * Records telemetry for out-of-order IPC messages.
     */
    recordIpcOutOfOrder() {
        try {
            this.registry.epochSync.ipcOutOfOrder++;
        } catch (e) {}
    }

    /**
     * Records telemetry for SPA navigation detection.
     * @param {string} [type]
     */
    recordSpaNavigation(type) {
        try {
            this.registry.epochSync.spaNavigationDetected++;
        } catch (e) {}
    }

    /**
     * Records telemetry for shadow mode execution comparison between legacy and v2 resolution pipelines.
     * @param {string} commandId
     * @param {object} legacyResult
     * @param {object} v2Result
     */
    recordShadowMode(commandId, legacyResult, v2Result) {
        try {
            if (!this.registry.shadowMode) {
                this.registry.shadowMode = { total: 0, matches: 0, mismatches: 0 };
            }
            this.registry.shadowMode.total++;
            const legacyLoc = legacyResult?.locator || legacyResult?.playwrightLocator || null;
            const v2Loc = v2Result?.locator || v2Result?.playwrightLocator || null;
            if (legacyLoc !== v2Loc) {
                this.registry.shadowMode.mismatches++;
            } else {
                this.registry.shadowMode.matches++;
            }
        } catch (e) {
            // Passive - ignore errors
        }
    }
}

export const TelemetryCollector = new TelemetryCollectorImpl();
