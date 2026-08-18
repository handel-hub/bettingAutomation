import fs from 'fs';

export class BaselineMetrics {
    constructor() {
        this.reset();
    }

    reset() {
        this.totalAttempts = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.latencies = [];
        this.maxLatencies = 50000; // Cap to prevent unbounded memory growth
        this.failureDistribution = {};
        this.strategyStats = {};
    }

    recordAttempt(url, durationMs, success, errorCode = null, strategy = null) {
        this.totalAttempts++;
        if (success) {
            this.successCount++;
        } else {
            this.failureCount++;
            const code = errorCode || 'UNKNOWN_ERROR';
            this.failureDistribution[code] = (this.failureDistribution[code] || 0) + 1;
        }

        if (this.latencies.length < this.maxLatencies) {
            this.latencies.push(durationMs);
        } else {
            // Replace random element or sliding window when full
            this.latencies[this.totalAttempts % this.maxLatencies] = durationMs;
        }

        if (strategy) {
            if (!this.strategyStats[strategy]) {
                this.strategyStats[strategy] = { attempts: 0, successes: 0 };
            }
            this.strategyStats[strategy].attempts++;
            if (success) {
                this.strategyStats[strategy].successes++;
            }
        }
    }

    getSummary() {
        const successRate = this.totalAttempts > 0 ? this.successCount / this.totalAttempts : 0;

        let p50 = 0, p95 = 0, p99 = 0, mean = 0;
        const len = this.latencies.length;
        if (len > 0) {
            const sorted = [...this.latencies].sort((a, b) => a - b);
            const sum = sorted.reduce((acc, val) => acc + val, 0);
            mean = sum / len;
            p50 = sorted[Math.floor(len * 0.50)] || 0;
            p95 = sorted[Math.floor(len * 0.95)] || 0;
            p99 = sorted[Math.floor(len * 0.99)] || 0;
        }

        const strategySuccess = {};
        for (const [strat, stats] of Object.entries(this.strategyStats)) {
            strategySuccess[strat] = stats.attempts > 0 ? stats.successes / stats.attempts : 0;
        }

        return {
            totalAttempts: this.totalAttempts,
            successRate,
            latency: {
                p50: Number(p50.toFixed(2)),
                p95: Number(p95.toFixed(2)),
                p99: Number(p99.toFixed(2)),
                mean: Number(mean.toFixed(2))
            },
            failureDistribution: { ...this.failureDistribution },
            strategySuccess
        };
    }

    compareAgainst(newSummary) {
        const thisSummary = this.getSummary();
        const successRateDelta = newSummary.successRate - thisSummary.successRate;
        const p95LatencyDelta = newSummary.latency.p95 - thisSummary.latency.p95;

        const reasons = [];
        let regressed = false;

        // Success rate drop > 0.5% (0.005)
        if (successRateDelta < -0.005) {
            regressed = true;
            const dropPct = (Math.abs(successRateDelta) * 100).toFixed(2);
            reasons.push(`Success rate regressed by ${dropPct}% (threshold: 0.50%)`);
        }

        // P95 latency increase > 25ms
        if (p95LatencyDelta > 25) {
            regressed = true;
            reasons.push(`P95 latency increased by ${p95LatencyDelta.toFixed(2)}ms (threshold: 25ms)`);
        }

        return {
            successRateDelta: Number(successRateDelta.toFixed(4)),
            p95LatencyDelta: Number(p95LatencyDelta.toFixed(2)),
            regressed,
            reasons
        };
    }

    exportToFile(filepath) {
        const data = JSON.stringify(this.getSummary(), null, 2);
        fs.writeFileSync(filepath, data, 'utf-8');
    }

    static loadFromFile(filepath) {
        const data = fs.readFileSync(filepath, 'utf-8');
        const summary = JSON.parse(data);
        const metrics = new BaselineMetrics();
        metrics.totalAttempts = summary.totalAttempts || 0;
        metrics.successCount = Math.round(metrics.totalAttempts * (summary.successRate || 0));
        metrics.failureCount = metrics.totalAttempts - metrics.successCount;
        metrics.failureDistribution = summary.failureDistribution || {};
        
        // Reconstruct synthetic latencies if only summary is loaded so comparison works
        if (summary.latency && summary.latency.p95) {
            metrics.latencies = [summary.latency.p50 || 0, summary.latency.p95, summary.latency.p99 || summary.latency.p95];
        }
        return metrics;
    }
}
export default BaselineMetrics;
