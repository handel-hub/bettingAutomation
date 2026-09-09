import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriggerRouter } from '../../../src/browser/execution/TriggerRouter.mjs';
import { Command } from '../../../src/browser/execution/Command.mjs';

describe('Cashout in TriggerRouter', () => {
    let router;
    let mockRunOrchestrator;
    let mockWorkflowEngine;

    beforeEach(() => {
        mockRunOrchestrator = {
            isExecuting: vi.fn().mockReturnValue(false),
            acquireOwnership: vi.fn().mockReturnValue({ runId: 'lease-123' })
        };
        mockWorkflowEngine = {};
        router = new TriggerRouter(mockRunOrchestrator, mockWorkflowEngine);
    });

    it('intercepts cashout click from DOM and produces Workflow:cashout while suppressing raw click', () => {
        const clickCmd = new Command({
            category: 'Execution',
            type: 'CLICK',
            ges: 42,
            payload: {
                isCashout: true,
                betId: '260905154630bet56580023',
                selector: 'button.m-btn--cashout'
            }
        });

        const result = router.interceptDomSync(clickCmd, 'master');

        expect(Array.isArray(result)).toBe(true);
        const [noopCmd, workflowCmd] = result;

        // Raw click converted to NOOP to prevent slaves from blindly clicking structural elements
        expect(noopCmd.type).toBe('NOOP');
        expect(noopCmd.ges).toBe(42);

        // Logical workflow command produced
        expect(workflowCmd.category).toBe('Workflow');
        expect(workflowCmd.type).toBe('cashout');
        expect(workflowCmd.executionMode).toBe('UNIQUE_ACCOUNTS_ONLY');
        expect(workflowCmd.runId).toBe('lease-123');
        expect(workflowCmd.payload.betId).toBe('260905154630bet56580023');

        expect(mockRunOrchestrator.acquireOwnership).toHaveBeenCalledWith('master', 'CASHOUT_DOM_SYNC');
    });

    it('suppresses cashout click if browser is already EXECUTING', () => {
        mockRunOrchestrator.isExecuting.mockReturnValue(true);

        const clickCmd = new Command({
            category: 'Execution',
            type: 'CLICK',
            ges: 43,
            payload: {
                isCashout: true,
                selector: 'button.m-btn--cashout'
            }
        });

        const result = router.interceptDomSync(clickCmd, 'master');

        expect(result.type).toBe('NOOP');
        expect(result.ges).toBe(43);
        expect(mockRunOrchestrator.acquireOwnership).not.toHaveBeenCalled();
    });

    it('intercepts hotkey cashout and assigns runId', () => {
        const hotkeyCmd = new Command({
            category: 'Workflow',
            type: 'cashout',
            source: 'CommandReceiver'
        });

        const result = router.interceptHotkey(hotkeyCmd, 'master');

        expect(result.type).toBe('cashout');
        expect(result.runId).toBe('lease-123');
        expect(mockRunOrchestrator.acquireOwnership).toHaveBeenCalledWith('master', 'CASHOUT_HOTKEY');
    });

    it('suppresses cashout click at Gate 1 if browser is UNAUTHORIZED', () => {
        mockRunOrchestrator.bettingAuthorizationRegistry = {
            isAuthorized: vi.fn().mockReturnValue(false)
        };

        const clickCmd = new Command({
            category: 'Execution',
            type: 'CLICK',
            ges: 45,
            payload: {
                isCashout: true,
                selector: 'button.m-btn--cashout'
            }
        });

        const result = router.interceptDomSync(clickCmd, 'slave-1');

        expect(result.type).toBe('NOOP');
        expect(result.ges).toBe(45);
        expect(result.payload.reason).toBe('UNAUTHORIZED_FOR_CASHOUT');
        expect(mockRunOrchestrator.acquireOwnership).not.toHaveBeenCalled();
    });

    it('sanitizes Playwright pseudo-selectors and sets masterBetId on workflow command', () => {
        const clickCmd = new Command({
            category: 'Execution',
            type: 'CLICK',
            ges: 46,
            payload: {
                isCashout: true,
                betId: 'master-bet-007',
                selector: 'internal:role=button[name="Cashout"i] >> nth=0'
            }
        });

        const result = router.interceptDomSync(clickCmd, 'master');

        expect(Array.isArray(result)).toBe(true);
        const [noopCmd, workflowCmd] = result;

        expect(noopCmd.type).toBe('NOOP');
        expect(workflowCmd.type).toBe('cashout');
        expect(workflowCmd.payload.betId).toBe('master-bet-007');
        expect(workflowCmd.payload.masterBetId).toBe('master-bet-007');
        // Pseudo-selector must be stripped out so slaves do not fail document.querySelector
        expect(workflowCmd.payload.selector).toBeNull();
    });
});
