import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CashoutCycle } from '../../../src/browser/workflows/CashoutCycle.mjs';

describe('CashoutCycle', () => {
    let mockSimulator;
    let mockRunOrchestrator;
    let mockBrowser;

    beforeEach(() => {
        mockSimulator = {
            execute: vi.fn()
        };
        mockRunOrchestrator = {
            setActiveCycle: vi.fn(),
            clearActiveCycle: vi.fn()
        };
        mockBrowser = { id: 'browser-01', page: {} };
    });

    it('manages active cycle lease and executes ATOMIC_CASHOUT', async () => {
        mockSimulator.execute.mockResolvedValueOnce({ status: 'SUCCESS' });

        const cycle = new CashoutCycle({
            runId: 'run-10',
            cycleId: 'cycle-10',
            betId: '260905154630bet56580023',
            simulator: mockSimulator,
            runOrchestrator: mockRunOrchestrator
        });

        const result = await cycle.execute(mockBrowser);

        expect(result.status).toBe('SUCCESS');
        expect(mockRunOrchestrator.setActiveCycle).toHaveBeenCalledWith('run-10', 'cycle-10');
        expect(mockRunOrchestrator.clearActiveCycle).toHaveBeenCalledWith('run-10');
        expect(mockSimulator.execute).toHaveBeenCalledTimes(1);

        const command = mockSimulator.execute.mock.calls[0][1];
        expect(command.type).toBe('ATOMIC_CASHOUT');
        expect(command.payload.betId).toBe('260905154630bet56580023');
        expect(command.idempotent).toBe(false);
    });

    it('returns UNCERTAIN when simulator throws ATOMIC-UNKNOWN', async () => {
        mockSimulator.execute.mockRejectedValueOnce(new Error('[ATOMIC-UNKNOWN] Post-boundary timeout'));

        const cycle = new CashoutCycle({
            runId: 'run-11',
            cycleId: 'cycle-11',
            betId: 'bet999',
            simulator: mockSimulator,
            runOrchestrator: mockRunOrchestrator
        });

        const result = await cycle.execute(mockBrowser);

        expect(result.status).toBe('UNCERTAIN');
        expect(mockRunOrchestrator.clearActiveCycle).toHaveBeenCalledWith('run-11');
    });

    it('returns ABORTED when simulator throws ATOMIC-ABORT', async () => {
        mockSimulator.execute.mockRejectedValueOnce(new Error('[ATOMIC-ABORT] Target open bet not found'));

        const cycle = new CashoutCycle({
            runId: 'run-12',
            cycleId: 'cycle-12',
            betId: 'bet999',
            simulator: mockSimulator,
            runOrchestrator: mockRunOrchestrator
        });

        const result = await cycle.execute(mockBrowser);

        expect(result.status).toBe('ABORTED');
        expect(mockRunOrchestrator.clearActiveCycle).toHaveBeenCalledWith('run-12');
    });
});
