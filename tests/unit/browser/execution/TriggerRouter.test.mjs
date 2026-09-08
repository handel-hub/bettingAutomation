import { describe, it, expect, vi } from 'vitest';
import { TriggerRouter } from '../../../../src/browser/execution/TriggerRouter.mjs';
import { Command } from '../../../../src/browser/execution/Command.mjs';

describe('TriggerRouter', () => {
    const mockRunOrchestrator = {
        acquireOwnership: vi.fn(),
        isExecuting: vi.fn().mockReturnValue(false)
    };
    const mockWorkflowEngine = {};

    it('suppresses betslip success OK button and emits SLAVES_ONLY NOOP preserving GES', () => {
        const router = new TriggerRouter(mockRunOrchestrator, mockWorkflowEngine);
        const cmd = new Command({
            category: 'Execution',
            type: 'click',
            ges: 159,
            payload: {
                playwrightSelector: 'internal:role=button[name="OK"s]'
            }
        });

        const result = router.interceptDomSync(cmd, 'master');
        expect(result).toBeInstanceOf(Command);
        expect(result.type).toBe('NOOP');
        expect(result.ges).toBe(159);
        expect(result.executionMode).toBe('SLAVES_ONLY');
        expect(result.payload.reason).toBe('Suppressed success modal dismiss sync');
    });

    it('suppresses betslip data-op OK button', () => {
        const router = new TriggerRouter(mockRunOrchestrator, mockWorkflowEngine);
        const cmd = new Command({
            category: 'Execution',
            type: 'click',
            ges: 160,
            payload: {
                selector: 'button[data-op="betslip-success-ok"]'
            }
        });

        const result = router.interceptDomSync(cmd, 'master');
        expect(result).toBeInstanceOf(Command);
        expect(result.type).toBe('NOOP');
        expect(result.ges).toBe(160);
        expect(result.executionMode).toBe('SLAVES_ONLY');
    });

    it('suppresses betslip rebet button and emits SLAVES_ONLY NOOP', () => {
        const router = new TriggerRouter(mockRunOrchestrator, mockWorkflowEngine);
        const cmd = new Command({
            category: 'Execution',
            type: 'click',
            ges: 161,
            payload: {
                selector: 'button[data-op="betslip-success-rebet"]'
            }
        });

        const result = router.interceptDomSync(cmd, 'master');
        expect(result).toBeInstanceOf(Command);
        expect(result.type).toBe('NOOP');
        expect(result.ges).toBe(161);
        expect(result.executionMode).toBe('SLAVES_ONLY');
        expect(result.payload.reason).toBe('Suppressed automated rebet sync');
    });

    it('allows normal clicks outside betslip overlay to broadcast', () => {
        const router = new TriggerRouter(mockRunOrchestrator, mockWorkflowEngine);
        const cmd = new Command({
            category: 'Execution',
            type: 'click',
            ges: 162,
            payload: {
                selector: '.match-card >> text=Arsenal'
            }
        });

        const result = router.interceptDomSync(cmd, 'master');
        expect(result).toBe(cmd);
    });
});
