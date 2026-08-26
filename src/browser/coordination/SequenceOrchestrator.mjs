import { logger } from '../../config.mjs';
import { globalRecorder } from '../../rkp/RuntimeKnowledgePlatform.mjs';
import crypto from 'node:crypto';

/**
 * SequenceOrchestrator - Node.js Execution Plane Component
 * Manages the lifecycle of ExecutionSequences, including spawning Root sequences 
 * from User intent, and spawning Child sequences based on Policy Rebet triggers.
 */
export class SequenceOrchestrator {
    /**
     * @param {Map} sequenceMap - In-memory map of active ExecutionSequences
     * @param {Object} policyManager - Manager for active JSON policies
     * @param {Object} commandRouter - IPC Router
     */
    constructor(sequenceMap, policyManager, commandRouter) {
        this.sequenceMap = sequenceMap;
        this.policyManager = policyManager;
        this.commandRouter = commandRouter;
    }

    /**
     * Initiates a brand new betting sequence from a user command.
     */
    startRootSequence(browserId, policyId) {
        const policy = this.policyManager.getPolicy(policyId);
        if (!policy) throw new Error(`Cannot start sequence: Policy ${policyId} not found`);

        const sequenceId = crypto.randomUUID();
        
        const sequence = {
            sequenceId,
            rootSequenceId: sequenceId,
            rebetIteration: 0,
            policyId,
            state: 'INIT',
            updatedAt: Date.now()
        };

        this.sequenceMap.set(sequenceId, sequence);
        
        globalRecorder.recordEvent('SEQUENCE_STARTED', {
            sequenceId,
            rootSequenceId: sequenceId,
            rebetIteration: 0,
            policyId,
            browserId
        });

        logger.info(`[SequenceOrchestrator] Started Root Sequence [${sequenceId}]`);

        // Wake up the Edge machine to start observing
        this.commandRouter.dispatchTo(browserId, {
            category: 'Execution',
            type: 'START_EDGE_OBSERVATION',
            payload: { sequenceId, policy }
        });

        return sequenceId;
    }

    /**
     * Processes a definitive settlement outcome (WIN/LOSS/VOID) 
     * and evaluates if a Rebet sequence should be autonomously spawned.
     */
    processSettlement(sequenceId, browserId, settlementStatus, payoutCents) {
        const currentSeq = this.sequenceMap.get(sequenceId);
        if (!currentSeq || currentSeq.state === 'TERMINATED') return;

        // 1. Mark as Terminated (Settled)
        currentSeq.state = 'TERMINATED';
        currentSeq.updatedAt = Date.now();

        globalRecorder.recordEvent('SETTLEMENT_RECORDED', {
            sequenceId,
            status: settlementStatus,
            payoutCents
        });

        logger.info(`[SequenceOrchestrator] Seq [${sequenceId}] SETTLED as ${settlementStatus}. Payout: ${payoutCents}`);

        // 2. Evaluate Rebet Policy
        const policy = this.policyManager.getPolicy(currentSeq.policyId);
        if (!policy) return;

        const shouldRebet = 
            (policy.rebetTrigger === 'ON_WIN' && settlementStatus === 'WIN') ||
            (policy.rebetTrigger === 'ON_LOSS' && settlementStatus === 'LOSS');

        if (shouldRebet) {
            if (currentSeq.rebetIteration < policy.maxRebetCount) {
                this._spawnChildSequence(browserId, currentSeq, policy);
            } else {
                logger.info(`[SequenceOrchestrator] Max rebets (${policy.maxRebetCount}) reached for Root [${currentSeq.rootSequenceId}]. Halting.`);
            }
        }
    }

    _spawnChildSequence(browserId, parentSeq, policy) {
        const newSequenceId = crypto.randomUUID();
        const nextIteration = parentSeq.rebetIteration + 1;
        
        const childSeq = {
            sequenceId: newSequenceId,
            rootSequenceId: parentSeq.rootSequenceId,
            rebetIteration: nextIteration,
            policyId: parentSeq.policyId,
            state: 'INIT',
            updatedAt: Date.now()
        };

        this.sequenceMap.set(newSequenceId, childSeq);

        globalRecorder.recordEvent('REBET_SEQUENCE_STARTED', {
            sequenceId: newSequenceId,
            rootSequenceId: parentSeq.rootSequenceId,
            rebetIteration: nextIteration,
            policyId: parentSeq.policyId,
            browserId
        });

        logger.info(`[SequenceOrchestrator] Spawning Rebet Sequence [${newSequenceId}] (Iteration ${nextIteration})`);

        // Send the new command to the edge
        this.commandRouter.dispatchTo(browserId, {
            category: 'Execution',
            type: 'START_EDGE_OBSERVATION',
            payload: { sequenceId: newSequenceId, policy }
        });
    }
}
