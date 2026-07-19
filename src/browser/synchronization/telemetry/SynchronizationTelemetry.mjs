export class SynchronizationTelemetry {
    constructor() {
        this.metrics = {
            totalBarriers: 0,
            failedBarriers: 0,
            totalRecoveries: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            dependencyInvalidations: 0,
            averageRecoveryTimeMs: 0,
            averageLatencyMs: 0
        };
    }

    recordBarrier(latencyMs, success) {
        this.metrics.totalBarriers++;
        if (!success) {
            this.metrics.failedBarriers++;
        }
        this.metrics.averageLatencyMs = this._rollingAverage(this.metrics.averageLatencyMs, latencyMs, this.metrics.totalBarriers);
    }

    recordRecovery(result) {
        this.metrics.totalRecoveries++;
        if (result.status === 'SUCCESS') {
            this.metrics.successfulRecoveries++;
        } else {
            this.metrics.failedRecoveries++;
        }
        this.metrics.averageRecoveryTimeMs = this._rollingAverage(this.metrics.averageRecoveryTimeMs, result.elapsed, this.metrics.totalRecoveries);
    }

    recordInvalidation(count = 1) {
        this.metrics.dependencyInvalidations += count;
    }

    getSummary() {
        return { ...this.metrics };
    }

    _rollingAverage(currentAverage, newValue, totalCount) {
        return currentAverage + (newValue - currentAverage) / totalCount;
    }
}
