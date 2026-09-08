import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CashoutTransaction } from '../../../src/browser/workflows/CashoutTransaction.mjs';

describe('CashoutTransaction', () => {
    let mockSimulator;
    let mockRunOrchestrator;
    let mockBrowser;

    beforeEach(() => {
        mockSimulator = {
            execute: vi.fn()
        };
        mockRunOrchestrator = {
            setActiveCycle: vi.fn(),
            clearActiveCycle: vi.fn(),
            markUncertain: vi.fn(),
            releaseOwnership: vi.fn()
        };
        mockBrowser = { id: 'browser-01', page: {} };
    });

    it('completes successfully when cycle returns SUCCESS', async () => {
        mockSimulator.execute.mockResolvedValueOnce({ status: 'SUCCESS' });

        const transaction = new CashoutTransaction('run-1', 'browser-01', mockSimulator, mockRunOrchestrator, {
            betId: 'bet12345'
        });

        const result = await transaction.start(mockBrowser);

        expect(result.status).toBe('COMPLETED');
        expect(result.cycles).toBe(1);
        expect(transaction.state).toBe('COMPLETED');
    });

    it('freezes and halts when cycle returns UNCERTAIN without retrying', async () => {
        mockSimulator.execute.mockRejectedValueOnce(new Error('[ATOMIC-UNKNOWN] Timeout waiting for server confirmation'));

        const transaction = new CashoutTransaction('run-2', 'browser-01', mockSimulator, mockRunOrchestrator, {
            betId: 'bet12345'
        });

        const result = await transaction.start(mockBrowser);

        expect(result.status).toBe('UNCERTAIN');
        expect(result.cycles).toBe(1); // Never retry on UNCERTAIN!
        expect(transaction.state).toBe('UNCERTAIN');
    });

    it('retries on pre-boundary ABORT and succeeds on second attempt', async () => {
        // First attempt aborts before boundary (e.g. modal didn't appear in time)
        mockSimulator.execute.mockRejectedValueOnce(new Error('[ATOMIC-ABORT] Confirmation modal failed to appear'));
        // Second attempt succeeds
        mockSimulator.execute.mockResolvedValueOnce({ status: 'SUCCESS' });

        const transaction = new CashoutTransaction('run-3', 'browser-01', mockSimulator, mockRunOrchestrator, {
            betId: 'bet12345'
        });

        const result = await transaction.start(mockBrowser);

        expect(result.status).toBe('COMPLETED');
        expect(result.cycles).toBe(2);
        expect(transaction.state).toBe('COMPLETED');
    });

    it('terminates immediately if cashout is disabled', async () => {
        mockSimulator.execute.mockRejectedValueOnce(new Error('[ATOMIC-ABORT] Cashout button is currently disabled for this bet'));

        const transaction = new CashoutTransaction('run-4', 'browser-01', mockSimulator, mockRunOrchestrator, {
            betId: 'bet12345'
        });

        const result = await transaction.start(mockBrowser);

        expect(result.status).toBe('ABORTED');
        expect(result.cycles).toBe(1); // Do not retry if disabled!
    });
});
