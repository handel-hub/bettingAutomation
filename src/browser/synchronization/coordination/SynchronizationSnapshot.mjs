export class SynchronizationSnapshot {
    constructor(browserId, browserState, capabilityStates, consistency, recoveryState, telemetrySummary) {
        this.browserId = browserId;
        this.browserState = browserState;
        this.capabilityStates = capabilityStates; // Map or object of capabilities to their status
        this.consistency = consistency; // consistencyScore
        this.recoveryState = recoveryState;
        this.telemetrySummary = telemetrySummary;
        this.timestamp = Date.now();
    }
}
