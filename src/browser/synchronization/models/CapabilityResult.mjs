/**
 * Standardized result object returned by Capability Providers.
 */
export class CapabilityResult {
    constructor({ status, capability, latency = 0, telemetry = {}, reason = null }) {
        this.status = status;       // 'SATISFIED', 'WAITING', 'TIMEOUT', 'FAILED'
        this.capability = capability; // e.g., 'DOM_READY'
        this.timestamp = Date.now();
        this.latency = latency;
        this.telemetry = telemetry;
        this.reason = reason;
    }
}
