import { logger } from '../../utils/logger.mjs';
import { globalRecorder } from '../../rkp/RuntimeKnowledgePlatform.mjs';
import crypto from 'node:crypto';
import { forensicLogger } from '../forensics/ForensicLogger.mjs';

/**
 * RunOrchestrator - Evolves the older SequenceOrchestrator.
 * Maintains the atomic boundary between PASSIVE and EXECUTING states.
 * Enforces single-flight ownership and interacts with the RunLedger WAL.
 */
export class RunOrchestrator {
    constructor(runLedger, registry, commandRouter, bettingAuthorizationRegistry) {
        this.runLedger = runLedger;
        this.registry = registry;
        this.commandRouter = commandRouter;
        this.bettingAuthorizationRegistry = bettingAuthorizationRegistry;
        
        // Ownership map: accountId -> activeRun object
        // If an account is not in this map, it is PASSIVE.
        this.activeRuns = new Map();
    }

    /**
     * Attempts to acquire exclusive AUTOMATION ownership of an account.
     * Enforces Single-Flight logic (fails if already executing).
     * @returns {Object|null} The lease { runId, cycleId } or null if rejected.
     */
    acquireOwnership(accountId, triggerSource) {
        forensicLogger.log('OWNERSHIP_REQUEST', { ownershipId: accountId, accountId, browserId: accountId, triggerSource, previousState: this.activeRuns.has(accountId) ? 'EXECUTING' : 'PASSIVE' });
        
        // EARLY AUTHORIZATION REJECTION (GATE 1)
        if (this.bettingAuthorizationRegistry && !this.bettingAuthorizationRegistry.isAuthorized(accountId)) {
            forensicLogger.log('OWNERSHIP_REJECTED', { ownershipId: accountId, accountId, browserId: accountId, reason: 'UNAUTHORIZED_FOR_BETTING' });
            logger.warn(`[RunOrchestrator] Ownership acquisition rejected for [${accountId}]: Browser is explicitly UNAUTHORIZED to begin new betting transactions.`);
            return null;
        }

        if (this.activeRuns.has(accountId)) {
            forensicLogger.log('OWNERSHIP_REJECTED', { ownershipId: accountId, accountId, browserId: accountId, reason: 'Already EXECUTING' });
            logger.warn(`[RunOrchestrator] Ownership acquisition rejected for [${accountId}] via ${triggerSource}: Already EXECUTING.`);
            return null;
        }

        const runId = crypto.randomUUID();
        
        const runLease = {
            runId,
            cycleId: null, // Assigned later by AutomationRun -> BetCycle
            accountId,
            triggerSource,
            state: 'EXECUTING',
            acquiredAt: Date.now()
        };

        this.activeRuns.set(accountId, runLease);

        forensicLogger.log('OWNERSHIP_GRANTED', { ownershipId: accountId, accountId, browserId: accountId, runId, cycleId: null, previousState: 'PASSIVE', newState: 'EXECUTING' });
        logger.info(`[RunOrchestrator] Acquired AUTOMATION ownership for [${accountId}] via ${triggerSource}. Run: ${runId}`);
        
        if (globalRecorder) {
            globalRecorder.recordEvent('OWNERSHIP_ACQUIRED', { accountId, runId, triggerSource });
        }

        return { runId };
    }

    /**
     * Sets the active cycle for the current run, allowing transactional commands to execute.
     */
    setActiveCycle(runId, cycleId) {
        for (const run of this.activeRuns.values()) {
            if (run.runId === runId) {
                run.cycleId = cycleId;
                return true;
            }
        }
        return false;
    }

    /**
     * Clears the active cycle to seal the transactional boundary.
     */
    clearActiveCycle(runId) {
        for (const run of this.activeRuns.values()) {
            if (run.runId === runId) {
                run.cycleId = null;
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if a specific account is currently under AUTOMATION ownership.
     */
    isExecuting(accountId) {
        return this.activeRuns.has(accountId);
    }

    /**
     * Validates if a cycleId belongs to an active, authorized run.
     * Used by ActionSimulator to reject stale transactional commands.
     */
    validateActiveCycle(cycleId) {
        if (!cycleId) return false;
        for (const run of this.activeRuns.values()) {
            if (run.cycleId === cycleId) return true;
        }
        return false;
    }

    /**
     * Transitions a run to PROCESSING and writes to WAL.
     */
    markProcessing(accountId) {
        const run = this.activeRuns.get(accountId);
        if (!run) return;
        run.state = 'PROCESSING';
        this.runLedger.append(run.runId, run.cycleId, accountId, 'PROCESSING');
        logger.info(`[RunOrchestrator] Run [${run.runId}] entered PROCESSING.`);
    }

    /**
     * Marks a run as SETTLED in the WAL and releases ownership, returning to PASSIVE.
     */
    releaseOwnership(accountId, result = 'SUCCESS') {
        const run = this.activeRuns.get(accountId);
        if (!run) return;
        
        if (run.state === 'PROCESSING') {
            this.runLedger.append(run.runId, run.cycleId, accountId, 'SETTLEMENT', result);
        }

        this.activeRuns.delete(accountId);
        forensicLogger.log('OWNERSHIP_RELEASED', { ownershipId: accountId, accountId, browserId: accountId, runId: run.runId, cycleId: run.cycleId, previousState: 'EXECUTING', newState: 'PASSIVE', result });
        logger.info(`[RunOrchestrator] Released AUTOMATION ownership for [${accountId}]. Returned to PASSIVE.`);
        
        if (globalRecorder) {
            globalRecorder.recordEvent('OWNERSHIP_RELEASED', { accountId, runId: run.runId, result });
        }
    }

    /**
     * Called when a run crashes during PROCESSING or reaches timeout.
     */
    markUncertain(accountId) {
        const run = this.activeRuns.get(accountId);
        if (!run) return;
        run.state = 'UNCERTAIN';
        logger.warn(`[RunOrchestrator] Run [${run.runId}] marked UNCERTAIN. Freezing account [${accountId}] pending reconciliation.`);
        // Note: Ownership is NOT released! The account remains locked to prevent further passive triggers.
    }
}
