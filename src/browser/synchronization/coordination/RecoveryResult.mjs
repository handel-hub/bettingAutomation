export class RecoveryResult {
    constructor(status, strategy, elapsed, recoveredCapabilities = [], failedCapabilities = [], attempts = 1, diagnostics = null) {
        this.status = status; // SUCCESS, FAILED, PARTIAL, ABORTED, UNSUPPORTED
        this.strategy = strategy;
        this.elapsed = elapsed;
        this.recoveredCapabilities = recoveredCapabilities;
        this.failedCapabilities = failedCapabilities;
        this.attempts = attempts;
        this.diagnostics = diagnostics;
    }
}
