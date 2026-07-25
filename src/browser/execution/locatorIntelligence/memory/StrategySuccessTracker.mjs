export class StrategySuccessTracker {
    constructor() {
        // Map: domain -> (Map: strategyName -> { success, total })
        this.tracking = new Map();
    }

    _getDomainStats(domain) {
        if (!this.tracking.has(domain)) {
            this.tracking.set(domain, new Map());
        }
        return this.tracking.get(domain);
    }

    recordOutcome(strategyName, domain, success) {
        const stats = this._getDomainStats(domain);
        if (!stats.has(strategyName)) {
            stats.set(strategyName, { success: 0, total: 0 });
        }
        const record = stats.get(strategyName);
        record.total += 1;
        if (success) {
            record.success += 1;
        }
    }

    getSuccessRate(strategyName, domain) {
        const stats = this._getDomainStats(domain);
        if (!stats.has(strategyName)) {
            return { success: 0, total: 0, rate: 0 };
        }
        const record = stats.get(strategyName);
        return {
            success: record.success,
            total: record.total,
            rate: record.total > 0 ? (record.success / record.total) : 0
        };
    }

    clear() {
        this.tracking.clear();
    }
}

export const strategySuccessTracker = new StrategySuccessTracker();
