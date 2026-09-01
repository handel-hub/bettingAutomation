import { logger } from '../../config.mjs';
import { Command } from './Command.mjs';
import { SportyBetLocatorRegistry } from '../adapters/sportybet/SportyBetLocatorRegistry.mjs';

/**
 * TriggerRouter - Intercepts commands at the boundary.
 * Enforces Causal Suppression (NOOP) for Place Bet clicks to prevent DOM feedback loops.
 */
export class TriggerRouter {
    constructor(runOrchestrator, workflowEngine) {
        this.runOrchestrator = runOrchestrator;
        this.workflowEngine = workflowEngine;
        this.locators = new SportyBetLocatorRegistry();
    }

    /**
     * Intercepts incoming physical DOM events from ActionDispatcher.
     * Fast-path bypasses non-CLICK commands. 
     * If it's a CLICK on the Place Bet button, acquires ownership and suppresses sync.
     * 
     * @param {Command} command 
     * @param {String} browserId 
     * @returns {Command|null} Returns original command if safe to broadcast, or null to NOOP.
     */
    interceptDomSync(command, browserId) {
        // Fast-path bypass for non-click, non-input interactions
        const type = String(command.type).toLowerCase();
        if (type !== 'click' && type !== 'dblclick' && type !== 'input') {
            return command;
        }

        const selector = command.payload?.playwrightSelector || command.payload?.selector || '';
        
        // Phase 1: Causal Suppression of Automated Stake Sync
        // The virtual keyboard uses click events on [data-key="X"], not input events.
        if (selector.includes('data-key') || (type === 'input' && selector.includes(this.locators.stakeInput))) {
            if (this.passiveShadowDaemon && !this.passiveShadowDaemon.userControlled) {
                // The daemon is in automated control of the stakes.
                // Drop the generic Master DOM sync broadcast so Slaves execute their own local stakes.
                logger.info(`[TriggerRouter] Suppressing automated stake DOM sync broadcast from [${browserId}].`);
                return null;
            }
            return command; // If userControlled is true, allow manual broadcast
        }

        if (type !== 'click' && type !== 'dblclick') {
            return command;
        }

        // Use the adapter's locator to determine if this is a transactional trigger
        // We check for 'place-bet' or 'placebet' broadly to ensure Playwright's auto-generated selectors match.
        if (selector.includes('place-bet') || selector.includes('placebet')) {
            logger.info(`[TriggerRouter] Physical Place Bet click detected from DOM on [${browserId}].`);

            const lease = this.runOrchestrator.acquireOwnership(browserId, 'DOM_SYNC');
            if (lease) {
                // Return a Workflow command so EventBusRegistrar can natively route it to WorkflowEngine
                return new Command({
                    category: 'Workflow',
                    type: 'placebet',
                    source: 'TriggerRouter',
                    executionMode: 'UNIQUE_ACCOUNTS_ONLY',
                    runId: lease.runId
                });
            }
            return null; // Suppress duplicate physical clicks if already executing
        }

        return command;
    }

    /**
     * Intercepts hotkey triggers from CommandReceiver.
     */
    interceptHotkey(command, browserId) {
        if (command.category === 'Workflow' && command.type === 'placebet') {
            logger.info(`[TriggerRouter] Hotkey Place Bet detected on [${browserId}].`);

            const lease = this.runOrchestrator.acquireOwnership(browserId, 'HOTKEY');
            if (lease) {
                return new Command({
                    ...command,
                    runId: lease.runId
                });
            }
            return null; 
        }

        return command;
    }
}
