import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecoveryOrchestrator, RecoveryOutcome } from '../resolution/RecoveryOrchestrator.mjs';

describe('Phase 9: RecoveryOrchestrator Unit Tests', () => {
    let orchestrator;
    let mockPage;

    beforeEach(() => {
        orchestrator = new RecoveryOrchestrator();
        mockPage = {
            reload: vi.fn().mockResolvedValue()
        };
        // Mock PageStateMonitorStub
        orchestrator.pageStateMonitor.getStabilityState = vi.fn().mockResolvedValue('STABLE');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should resolve in L1 if resolveFn succeeds immediately', async () => {
        const resolveFn = vi.fn().mockResolvedValue({ success: true, dummy: 'result' });
        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage);
        
        expect(outcome.status).toBe('RESOLVED');
        expect(outcome.level).toBe('L1');
        expect(outcome.result.dummy).toBe('result');
        expect(outcome.attempts).toBe(1);
    });

    it('should resolve in L1 after a few transient failures', async () => {
        let calls = 0;
        const resolveFn = vi.fn().mockImplementation(async () => {
            calls++;
            if (calls < 3) throw new Error('Transient error');
            return { success: true };
        });

        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage);
        
        expect(outcome.status).toBe('RESOLVED');
        expect(outcome.level).toBe('L1');
        expect(outcome.attempts).toBe(3);
        expect(outcome.history.length).toBe(2);
        expect(outcome.history[0].level).toBe('L1');
    });

    it('should escalate to L2 if L1 budget exhausted, and resolve there if page is RENDERING', async () => {
        const startTime = Date.now();
        // Mock stability: initially RENDERING, then STABLE
        orchestrator.pageStateMonitor.getStabilityState = vi.fn()
            .mockResolvedValueOnce('RENDERING')
            .mockResolvedValue('STABLE');

        const resolveFn = vi.fn().mockImplementation(async () => {
            // Force it to throw until at least 600ms have passed (ensuring L1 budget is exhausted)
            if (Date.now() - startTime < 600) {
                throw new Error('L1 failure');
            }
            return { success: true };
        });

        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage, { maxRecoveryMs: 5000 });
        
        expect(outcome.status).toBe('RESOLVED');
        expect(outcome.level).toBe('L2');
    });

    it('should skip at L3 if command is skippable (e.g. hover) and L1/L2 fail', async () => {
        // resolveFn always throws
        const resolveFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
        
        const outcome = await orchestrator.orchestrate(resolveFn, 'hover', mockPage, { maxRecoveryMs: 5000 });
        
        expect(outcome.status).toBe('SKIPPED');
        expect(outcome.level).toBe('L3');
        expect(mockPage.reload).not.toHaveBeenCalled();
    });

    it('should escalate to L4 (reload) if command is NOT skippable and L1/L2 fail', async () => {
        const resolveFn = vi.fn().mockImplementation(async () => {
            if (mockPage.reload.mock.calls.length === 0) throw new Error('L1/L2 failure'); // Fails during L1 and L2
            // Succeeds after L4 reload
            return { success: true };
        });
        
        // Mock getStabilityState to always return STABLE so L2 finishes fast (just 1 attempt)
        orchestrator.pageStateMonitor.getStabilityState.mockResolvedValue('STABLE');

        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage, { maxRecoveryMs: 5000 });
        
        expect(outcome.status).toBe('RESOLVED');
        expect(outcome.level).toBe('L4');
        expect(mockPage.reload).toHaveBeenCalledTimes(1);
    });
    
    it('should return ABORTED if even L4 fails', async () => {
        const resolveFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
        
        // STABLE so L2 doesn't wait 2000ms
        orchestrator.pageStateMonitor.getStabilityState.mockResolvedValue('STABLE');

        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage, { maxRecoveryMs: 5000 });
        
        expect(outcome.status).toBe('ABORTED');
        expect(outcome.level).toBe('L4');
        expect(mockPage.reload).toHaveBeenCalledTimes(1);
    });

    it('should abort immediately without retrying if resolveFn throws a terminal error (e.g. ConfidenceGateRejectionError)', async () => {
        const terminalError = new Error('ConfidenceGate rejected');
        terminalError.name = 'ConfidenceGateRejectionError';
        const resolveFn = vi.fn().mockRejectedValue(terminalError);
        
        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage);
        
        expect(outcome.status).toBe('ABORTED');
        expect(outcome.level).toBe('L1');
        expect(outcome.attempts).toBe(1); // Aborts on first attempt
        expect(outcome.terminalError).toBeDefined();
    });

    it('should treat [LF-302] Recoverable Confidence Miss as NON-terminal and retry until successful', async () => {
        let calls = 0;
        const resolveFn = vi.fn().mockImplementation(async () => {
            calls++;
            if (calls < 3) throw new Error('[LF-302] Recoverable Confidence Miss: slightly below threshold');
            return { success: true, result: 'recovered' };
        });

        const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage);
        
        expect(outcome.status).toBe('RESOLVED');
        expect(outcome.level).toBe('L1');
        expect(outcome.attempts).toBe(3);
        expect(outcome.history.length).toBe(2);
        expect(outcome.history[0].error).toContain('[LF-302]');
    });
});
