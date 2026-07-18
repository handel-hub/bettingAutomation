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

        // Failure Metrics (Map of LF Code -> Count)
        this.failures = new Map();

        // Execution Metrics (Hooks for ActionSimulator)
        this.execution = {
            total: 0,
            retries: new RollingWindow(128),
            resolverCycles: new RollingWindow(128),
            candidateExhaustion: new RollingWindow(128),
            confidenceDecay: new RollingWindow(128)
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
            failures: Object.fromEntries(this.failures),
            execution: {
                total: this.execution.total,
                averageRetries: this.execution.retries.average,
                averageResolverCycles: this.execution.resolverCycles.average,
                averageCandidateExhaustion: this.execution.candidateExhaustion.average,
                averageConfidenceDecay: this.execution.confidenceDecay.average
            }
        };
    }
}
