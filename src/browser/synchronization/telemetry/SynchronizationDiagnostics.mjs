export class SynchronizationDiagnostics {
    static generateReport(snapshot, timeline) {
        const failedCapabilities = Object.entries(snapshot.capabilityStates)
            .filter(([_, ready]) => !ready)
            .map(([cap]) => cap);

        return {
            browserId: snapshot.browserId,
            timestamp: snapshot.timestamp,
            consistencyScore: snapshot.consistency,
            blockingCapabilities: failedCapabilities,
            recoveryState: snapshot.recoveryState,
            telemetry: snapshot.telemetrySummary,
            timeline: timeline.getTimeline().slice(-20) // Last 20 events
        };
    }
}
