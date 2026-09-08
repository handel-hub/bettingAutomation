import { logger } from '../../utils/logger.mjs';
import { Command } from './Command.mjs';
import { SportyBetLocatorRegistry } from '../adapters/sportybet/SportyBetLocatorRegistry.mjs';
import { forensicLogger } from '../forensics/ForensicLogger.mjs';

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
        forensicLogger.log('TRIGGER_RECEIVED', { browserId, eventType: command.type, target: command.target, locator: command.payload?.selector, isTrusted: command.metadata?.isTrusted, commandId: command.id });
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
                forensicLogger.log('DOM_SYNC_SUPPRESSED', { browserId, reason: 'Suppressed automated stake sync', commandId: command.id });
                // The daemon is in automated control of the stakes.
                // Drop the generic Master DOM sync broadcast so Slaves execute their own local stakes.
                logger.info(`[TriggerRouter] Suppressing automated stake DOM sync broadcast from [${browserId}].`);
                if (command.ges !== undefined && command.ges !== null) {
                    return new Command({
                        category: 'Execution', type: 'NOOP', target: command.target || {}, source: 'TriggerRouter', ges: command.ges, executionMode: 'SLAVES_ONLY', payload: { reason: 'Suppressed automated stake sync' }
                    });
                }
                return null;
            }
            return command; // If userControlled is true, allow manual broadcast
        }

        if (type !== 'click' && type !== 'dblclick') {
            return command;
        }

        // Use the adapter's locator to determine if this is a transactional trigger
        // We check against the registry's exact CSS selector, as well as text-based semantic fallbacks.
        const selectorLower = selector.toLowerCase();
        const sidText = (command.payload?.sid?.text || '').toLowerCase();

        // Phase 1.5: Causal Suppression of Bet / Rebet Success Overlay Actions
        // Clicks on the betslip success modal (OK/Dismiss or Rebet) must not broadcast to Slaves,
        // because each browser autonomously resolves its success modal within its own AutomationRun.
        const matchesAny = (target, patterns) => {
            if (!target) return false;
            return patterns.some(p => p && target.includes(p));
        };
        const rebetPatterns = (this.locators.rebetTrigger || '').split(',').map(s => s.trim().toLowerCase());
        const okPatterns = (this.locators.successOkButton || '').split(',').map(s => s.trim().toLowerCase());

        const isRebetButton = matchesAny(selectorLower, rebetPatterns) ||
            selectorLower.includes('betslip-success-rebet') ||
            selectorLower.includes('m-btn-rebet') ||
            selectorLower.includes('role=button[name="rebet"') ||
            selectorLower.includes('role=button[name=\\"rebet\\"') ||
            sidText === 'rebet';

        const isSuccessOkButton = matchesAny(selectorLower, okPatterns) ||
            selectorLower.includes('betslip-success-ok') ||
            selectorLower.includes('data-cms-key="ok"') ||
            selectorLower.includes('m-btn-confirm') ||
            selectorLower.includes('role=button[name="ok"') ||
            selectorLower.includes('role=button[name=\\"ok\\"') ||
            sidText === 'ok';

        if (isRebetButton || isSuccessOkButton) {
            const reason = isRebetButton ? 'Suppressed automated rebet sync' : 'Suppressed success modal dismiss sync';
            forensicLogger.log('DOM_SYNC_SUPPRESSED', { browserId, reason, commandId: command.id });
            logger.info(`[TriggerRouter] Suppressing betslip success overlay action [${selector}] broadcast from [${browserId}].`);
            if (command.ges !== undefined && command.ges !== null) {
                return new Command({
                    category: 'Execution',
                    type: 'NOOP',
                    target: command.target || {},
                    source: 'TriggerRouter',
                    ges: command.ges,
                    executionMode: 'SLAVES_ONLY',
                    payload: { reason }
                });
            }
            return null;
        }

        if (selector.includes(this.locators.placeBetButton) || 
            selectorLower.includes('place-bet') || 
            selectorLower.includes('placebet') || 
            selectorLower.includes('place bet') ||
            sidText.startsWith('place ') ||
            selectorLower.includes('\"place ')) {
            forensicLogger.log('PLACE_BET_DETECTED', { browserId, commandId: command.id, locator: selector, text: sidText });
            logger.info(`[TriggerRouter] Physical Place Bet click detected from DOM on [${browserId}].`);

            // TRANSACTION BOUNDARY GATE (GATE 1 - EARLY REJECTION)
            if (this.runOrchestrator.bettingAuthorizationRegistry && !this.runOrchestrator.bettingAuthorizationRegistry.isAuthorized(browserId)) {
                forensicLogger.log('DOM_SYNC_SUPPRESSED', { browserId, reason: 'UNAUTHORIZED_FOR_BETTING', commandId: command.id });
                logger.warn(`[TriggerRouter] Suppressing physical Place Bet click on [${browserId}]: Browser is explicitly UNAUTHORIZED to begin new betting transactions.`);
                if (command.ges !== undefined && command.ges !== null) {
                    return new Command({
                        category: 'Execution', type: 'NOOP', target: command.target || {}, source: 'TriggerRouter', ges: command.ges, executionMode: 'SLAVES_ONLY', payload: { reason: 'UNAUTHORIZED_FOR_BETTING' }
                    });
                }
                return null;
            }

            const lease = this.runOrchestrator.acquireOwnership(browserId, 'DOM_SYNC');
            if (lease) {
                const workflowCmd = new Command({
                    category: 'Workflow',
                    type: 'placebet',
                    source: 'TriggerRouter',
                    executionMode: 'UNIQUE_ACCOUNTS_ONLY',
                    runId: lease.runId
                });
                forensicLogger.log('WORKFLOW_CREATED', { browserId, runId: lease.runId, commandId: workflowCmd.id });

                // Return both: Workflow for Master Orchestrator, and original click for Slaves to execute
                // so they remain consistent (e.g. they show the confirm dialog).
                return [command, workflowCmd];
            }
            
            // If already executing, still allow the physical click to sync to maintain consistency
            return command;
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
