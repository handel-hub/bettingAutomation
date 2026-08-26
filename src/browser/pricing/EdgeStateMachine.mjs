import { solve } from './PricingSolver.mjs';
import { applyBehavior } from './BehavioralEngine.mjs';

/**
 * EdgeStateMachine - The autonomous controller running inside the browser.
 */
export class EdgeStateMachine {
    constructor(observer, ipcBridge) {
        this.observer = observer;
        this.ipc = ipcBridge; // Abstraction for window.dispatchExecutionEvent
        this.state = 'IDLE';
        
        this.context = {
            activePolicy: null,
            sequenceId: null,
            observation: null,
            candidates: [],
            selectedStake: null,
            snapshot: null
        };

        // Bind DOM Mutated listener
        this.observer.on('DOM_MUTATED', () => this.handleEvent('DOM_MUTATED'));
    }

    transition(newState) {
        // Optional: Add logging here for audit trace
        // console.log(`[Edge] ${this.state} -> ${newState}`);
        this.state = newState;
        this.executeStateAction();
    }

    handleEvent(event, payload = null) {
        if (event === 'POLICY_UPDATE') {
            this.context.activePolicy = payload.policy;
            if (this.state === 'EVALUATING' || this.state === 'RESOLVING' || this.state === 'SELECTING') {
                this.transition('OBSERVING'); // Abort and restart with new policy
            } else if (this.state === 'PRE_FLIGHT') {
                this.transition('ABORTED'); // Dangerous. Abort click.
            }
            return;
        }

        switch (this.state) {
            case 'IDLE':
                if (event === 'START' && this.context.activePolicy) {
                    this.context.sequenceId = payload.sequenceId;
                    this.observer.start();
                    this.transition('OBSERVING');
                }
                break;
                
            case 'OBSERVING':
                if (event === 'DOM_STABLE') {
                    this.transition('EVALUATING');
                }
                break;

            case 'EVALUATING':
            case 'RESOLVING':
            case 'SELECTING':
            case 'READY':
                if (event === 'DOM_MUTATED') {
                    this.clearContext();
                    this.transition('OBSERVING');
                }
                break;

            case 'READY':
                if (event === 'EXECUTE_AUTHORIZED') {
                    if (payload.policyVersion === this.context.activePolicy.version) {
                        this.transition('PRE_FLIGHT');
                    } else {
                        // Policy updated centrally, but edge hasn't caught up yet.
                        this.transition('OBSERVING');
                    }
                } else if (event === 'AUTH_DENIED' || event === 'TIMEOUT') {
                    this.transition('OBSERVING');
                }
                break;
                
            case 'PRE_FLIGHT':
                // PRE_FLIGHT is synchronous. No events are handled here normally.
                break;

            case 'EXECUTING':
                if (event === 'RECEIPT_OK') {
                    this.ipc.send('SUBMISSION_RESULT', { sequenceId: this.context.sequenceId, status: 'SUCCESS' });
                    this.transition('SUBMITTED');
                } else if (event === 'TIMEOUT' || event === 'RECEIPT_FAIL') {
                    this.ipc.send('SUBMISSION_RESULT', { sequenceId: this.context.sequenceId, status: 'TIMEOUT' });
                    this.transition('ABORTED');
                }
                break;

            case 'SUBMITTED':
            case 'ABORTED':
                if (event === 'RESET') {
                    this.observer.stop();
                    this.clearContext(true); // Hard clear
                    this.transition('IDLE');
                }
                break;
        }
    }

    executeStateAction() {
        switch (this.state) {
            case 'EVALUATING': {
                const obs = this.observer.getSnapshot();
                if (!obs || obs.odds <= 1.0 || obs.marketSuspended) {
                    // Try again next stability window
                    setTimeout(() => this.handleEvent('DOM_STABLE'), 100);
                    return;
                }
                
                this.context.observation = obs;
                const cands = solve(obs, this.context.activePolicy);
                
                if (cands && cands.length > 0) {
                    this.context.candidates = cands;
                    this.transition('SELECTING');
                } else {
                    // Could trigger RESOLVING here if we split Math Solver logic, 
                    // but our Solver currently handles resolution internally.
                    // If still empty, it's truly unresolvable.
                    this.transition('OBSERVING');
                }
                break;
            }

            case 'SELECTING': {
                const selected = applyBehavior(this.context.candidates, this.context.activePolicy.behavioralFunctions);
                if (selected === null) {
                    this.transition('OBSERVING');
                } else {
                    this.context.selectedStake = selected;
                    this.context.snapshot = this.buildSnapshot();
                    this.transition('READY');
                }
                break;
            }

            case 'READY': {
                // Send IPC request for authorization
                this.ipc.send('AUTHORIZE_BET', {
                    sequenceId: this.context.sequenceId,
                    payload: this.context.snapshot
                });
                
                // Safety timeout
                this.authTimeout = setTimeout(() => this.handleEvent('TIMEOUT'), 5000);
                break;
            }

            case 'PRE_FLIGHT': {
                if (this.authTimeout) clearTimeout(this.authTimeout);
                
                // Synchronous TOCTOU verification
                const currentHash = this.observer.generateHash();
                if (currentHash === this.context.snapshot.observationHash) {
                    this.transition('EXECUTING');
                    // Perform physical click
                    this.performDOMClick();
                } else {
                    // TOCTOU Failure. The DOM changed while we were asking for permission!
                    this.transition('OBSERVING');
                }
                break;
            }

            case 'EXECUTING': {
                // In a real implementation, we would attach a listener or poll for the receipt element
                // We'll simulate receiving a receipt for this specification skeleton
                setTimeout(() => this.handleEvent('RECEIPT_OK'), 1000);
                break;
            }
        }
    }

    buildSnapshot() {
        return {
            snapshotId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
            observationHash: this.context.observation.domHash,
            policyVersion: this.context.activePolicy.version,
            selectedStake: this.context.selectedStake,
            projectedProfit: Math.floor(this.context.selectedStake * (this.context.observation.odds - 1.0))
        };
    }

    clearContext(full = false) {
        this.context.observation = null;
        this.context.candidates = [];
        this.context.selectedStake = null;
        this.context.snapshot = null;
        if (full) {
            this.context.sequenceId = null;
            // activePolicy remains until specifically updated
        }
    }

    performDOMClick() {
        // Platform specific click hook goes here
        // const btn = document.querySelector('.place-bet-button');
        // if (btn) btn.click();
    }
}
