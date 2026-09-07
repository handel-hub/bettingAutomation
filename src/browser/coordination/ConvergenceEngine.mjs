import { logger } from '../../utils/logger.mjs';
import EventEmitter from 'node:events';

export class ConvergenceEngine extends EventEmitter {
    constructor(verificationEngine = null) {
        super();
        // Pending convergence table: slaveId -> { commandId, timestamp, expectedHash, timeout }
        this.pending = new Map();
        
        // Default grace window ceiling (can be calibrated)
        this.GRACE_WINDOW_MS = 2000; 
        
        this.shadowMode = false; // Task A.3 specifies shadow mode
        this.verificationEngine = verificationEngine; // Will be injected in Task B.1
    }

    /**
     * Called when a primary command is dispatched to slaves, 
     * setting up an expectation for convergence.
     */
    expectConvergence(slaveId, commandId, expectedHash = null, expectedUrl = null) {
        this.pending.set(slaveId, {
            commandId,
            timestamp: Date.now(),
            expectedHash,
            expectedUrl,
            timeout: setTimeout(() => this.handleTimeout(slaveId, commandId), this.GRACE_WINDOW_MS)
        });
    }

    /**
     * Consumes StateObservation events from StateObserver.
     */
    processObservation(observation) {
        const { nodeId: slaveId, causingCommandId, domHash, url } = observation;

        const expected = this.pending.get(slaveId);
        if (!expected) {
            // No pending command expected for this slave
            if (this.shadowMode) {
                logger.debug(`[ConvergenceEngine/Shadow] Observation from ${slaveId} without pending command. url=${url}`);
            }
            return;
        }

        // Evaluate Convergence
        // 1. Direct causality via HLC
        let converged = false;
        let divergenceReason = null;

        if (causingCommandId && causingCommandId === expected.commandId) {
            converged = true;
        } else {
            // 2. State verification (fallback if no direct causality)
            if (expected.expectedHash && expected.expectedHash === domHash) {
                converged = true;
            } else {
                divergenceReason = `Causality mismatch: got ${causingCommandId}, expected ${expected.commandId}. Hash mismatch.`;
            }
        }

        if (this.shadowMode) {
            const status = converged ? 'EXPECTED' : 'DIVERGED';
            logger.info(`[ConvergenceEngine/Shadow] ${status} for slave ${slaveId} on command ${expected.commandId}. Reason: ${divergenceReason || 'Match'}`);
            this.clearPending(slaveId);
        } else {
            if (converged) {
                this.clearPending(slaveId);
                this.emit('ConvergenceAchieved', { slaveId, commandId: expected.commandId });
            } else {
                if (this.verificationEngine) {
                    const verificationResult = this.verificationEngine.verify(observation, expected);
                    if (verificationResult === 'EXPECTED') {
                        this.clearPending(slaveId);
                        this.emit('ConvergenceAchieved', { slaveId, commandId: expected.commandId });
                        return;
                    }
                }
                
                this.clearPending(slaveId);
                this.emit('ConvergenceDiverged', { 
                    slaveId, 
                    commandId: expected.commandId, 
                    reason: divergenceReason, 
                    actualHash: domHash, 
                    expectedHash: expected.expectedHash,
                    expectedUrl: expected.expectedUrl 
                });
            }
        }
    }

    handleTimeout(slaveId, commandId) {
        const expected = this.pending.get(slaveId);
        if (expected && expected.commandId === commandId) {
            if (this.shadowMode) {
                logger.warn(`[ConvergenceEngine/Shadow] TIMEOUT for slave ${slaveId} waiting for command ${commandId}`);
            } else {
                this.emit('ConvergenceTimeout', { slaveId, commandId });
                this.emit('ConvergenceDiverged', { 
                    slaveId, 
                    commandId: expected.commandId, 
                    reason: 'Timeout', 
                    actualHash: null, 
                    expectedHash: expected.expectedHash,
                    expectedUrl: expected.expectedUrl 
                });
            }
            this.clearPending(slaveId);
        }
    }

    clearPending(slaveId) {
        const expected = this.pending.get(slaveId);
        if (expected && expected.timeout) {
            clearTimeout(expected.timeout);
        }
        this.pending.delete(slaveId);
    }
}
