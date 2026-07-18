import { MetricsRegistry } from './MetricsRegistry.mjs';

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
}

export const TelemetryCollector = new TelemetryCollectorImpl();
