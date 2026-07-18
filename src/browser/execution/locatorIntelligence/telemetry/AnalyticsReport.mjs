export class AnalyticsReport {
    /**
     * Converts a TelemetryCollector snapshot into a human-readable text report.
     * @param {Object} snapshot The output from TelemetryCollector.snapshot()
     * @returns {string} Formatted markdown/text report
     */
    static generateHumanReadable(snapshot) {
        let report = `Locator Intelligence Report\n===========================\n\n`;

        // Resolution Section
        const successRate = snapshot.resolution.total > 0 
            ? ((snapshot.resolution.success / snapshot.resolution.total) * 100).toFixed(1)
            : 0;
            
        report += `Total Resolutions:\n${snapshot.resolution.total}\n\n`;
        report += `Success Rate:\n${successRate}%\n\n`;
        report += `Average Latency:\n${snapshot.resolution.averageLatency.toFixed(1)} ms\n\n`;
        report += `Average Retry Count:\n${snapshot.resolution.averageRetries.toFixed(1)}\n\n`;

        // Strategy Section
        report += `Top Successful Strategies\n-------------------------\n`;
        const strategies = Object.entries(snapshot.strategies).map(([name, stats]) => {
            const total = stats.success + stats.failed;
            const rate = total > 0 ? ((stats.success / total) * 100).toFixed(0) : 0;
            return { name, rate, success: stats.success };
        });

        // Sort descending by success count
        strategies.sort((a, b) => b.success - a.success);
        
        let rank = 1;
        for (const strat of strategies) {
            report += `${rank}.\n${strat.name} (${strat.rate}%)\n\n`;
            rank++;
            if (rank > 5) break; // Top 5
        }

        // Failure Section
        report += `Top LF Codes\n------------\n`;
        const failures = Object.entries(snapshot.failures).map(([code, count]) => ({ code, count }));
        failures.sort((a, b) => b.count - a.count);
        
        for (const f of failures) {
            report += `${f.code}\n${f.count}\n\n`;
        }
        
        return report.trim();
    }

    /**
     * Returns the snapshot as a formatted JSON string.
     * @param {Object} snapshot 
     * @returns {string} JSON representation
     */
    static generateJSON(snapshot) {
        return JSON.stringify(snapshot, null, 2);
    }
}
