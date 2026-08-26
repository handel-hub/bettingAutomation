import { logger } from '../../config.mjs';
import { globalRecorder } from '../../rkp/RuntimeKnowledgePlatform.mjs';

/**
 * AuthorizationGateway - Node.js Execution Plane Component
 * The cryptographic and logical gatekeeper for all Edge requests.
 */
export class AuthorizationGateway {
    /**
     * @param {Map} sequenceMap - In-memory map of active ExecutionSequences
     * @param {Object} policyManager - Manager for active JSON policies
     * @param {Object} commandRouter - IPC Router
     */
    constructor(sequenceMap, policyManager, commandRouter) {
        this.sequenceMap = sequenceMap;
        this.policyManager = policyManager;
        this.commandRouter = commandRouter;

        // Listen for AUTHORIZE_BET from the edge
        this.commandRouter.register('Execution', 'AUTHORIZE_BET', async (command) => {
            await this.handleAuthorizationRequest(command);
        });
    }

    async handleAuthorizationRequest(command) {
        const { target: browserId, payload } = command;
        const { sequenceId, snapshotId, policyVersion, observationHash, selectedStake } = payload;

        logger.info(`[AuthorizationGateway] Received AUTHORIZE_BET for Seq [${sequenceId}] from Browser [${browserId}]`);

        try {
            // 1. Load active Sequence state (In-Memory)
            const sequence = this.sequenceMap.get(sequenceId);
            if (!sequence) {
                return this.deny(browserId, sequenceId, snapshotId, 'UNKNOWN_SEQUENCE');
            }

            if (sequence.state !== 'INIT' && sequence.state !== 'AUTHORIZING') {
                return this.deny(browserId, sequenceId, snapshotId, 'SEQUENCE_ALREADY_IN_FLIGHT');
            }

            // 2. Load active Policy state
            const activePolicy = this.policyManager.getPolicy(sequence.policyId);
            if (!activePolicy) {
                return this.deny(browserId, sequenceId, snapshotId, 'POLICY_NOT_FOUND');
            }

            // 3. Strict Version Validation
            if (activePolicy.version !== policyVersion) {
                logger.warn(`[AuthorizationGateway] STALE_POLICY detected. Edge: v${policyVersion}, Active: v${activePolicy.version}`);
                return this.deny(browserId, sequenceId, snapshotId, 'STALE_POLICY');
            }

            // 4. Grant Authorization & Transition State
            sequence.state = 'AWAITING_SUBMISSION';
            
            // Record state transition using the existing RKP (Runtime Knowledge Platform)
            globalRecorder.recordEvent('AUTHORIZATION_GRANTED', {
                sequenceId,
                browserId,
                policyVersion,
                snapshotId,
                selectedStake,
                observationHash
            });

            logger.info(`[AuthorizationGateway] Seq [${sequenceId}] AUTHORIZED. Dispatching to Edge.`);
            
            // Dispatch EXECUTE_AUTHORIZED back to the specific browser edge
            this.commandRouter.dispatchTo(browserId, {
                category: 'Execution',
                type: 'EXECUTE_AUTHORIZED',
                payload: {
                    sequenceId,
                    snapshotId,
                    policyVersion: activePolicy.version
                }
            });

        } catch (err) {
            logger.error(`[AuthorizationGateway] Failed to process authorization: ${err.message}`);
            this.deny(browserId, sequenceId, snapshotId, 'INTERNAL_SERVER_ERROR');
        }
    }

    deny(browserId, sequenceId, snapshotId, reason) {
        globalRecorder.recordEvent('AUTHORIZATION_DENIED', {
            sequenceId,
            browserId,
            snapshotId,
            reason
        });

        this.commandRouter.dispatchTo(browserId, {
            category: 'Execution',
            type: 'AUTH_DENIED',
            payload: {
                sequenceId,
                snapshotId,
                reason
            }
        });
    }
}

