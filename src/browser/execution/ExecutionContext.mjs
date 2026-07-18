import { randomUUID } from 'crypto';

/**
 * Wraps a Command to track execution metadata seamlessly across subsystems.
 */
export class ExecutionContext {
    /**
     * @param {Object} command The raw command object to be executed.
     * @param {Object} options Optional context configuration.
     */
    constructor(command, options = {}) {
        this.executionId = randomUUID();
        this.command = command;
        
        // Cancellation token/signal
        this.cancellation = options.cancellation || null;
        
        // Tracing metadata
        this.tracing = options.tracing || {
            startedAt: Date.now(),
            stages: []
        };
        
        // Telemetry scope specific to this execution
        this.telemetry = options.telemetry || {
            resolutionAttempts: 0,
            barrierRetries: 0
        };
        
        // Execution priority
        this.priority = options.priority || 'NORMAL';
        
        // Retries
        this.retries = options.retries || {
            max: 3,
            attempted: 0
        };
    }

    /**
     * Appends a trace point.
     * @param {string} stage 
     */
    addTrace(stage) {
        this.tracing.stages.push({
            stage,
            timestamp: Date.now()
        });
    }
}
