import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SequenceGate } from '../../../src/browser/synchronization/SequenceGate.mjs';

describe('SequenceGate', () => {
    let registry;
    let gate;

    beforeEach(() => {
        registry = {
            getState: vi.fn(),
            on: vi.fn(),
            removeListener: vi.fn(),
            emit: vi.fn()
        };
        gate = new SequenceGate(registry);
        vi.useFakeTimers();
    });

    it('bypasses commands with no GES', () => {
        expect(gate.evaluate('slave-1', null)).toBe('ALIGNED');
        expect(gate.evaluate('slave-1', undefined)).toBe('ALIGNED');
    });

    it('returns ALIGNED when command GES is exactly next', () => {
        registry.getState.mockReturnValue({ currentGes: 5 });
        expect(gate.evaluate('slave-1', 6)).toBe('ALIGNED');
    });

    it('returns WAITING when command GES is further in future', () => {
        registry.getState.mockReturnValue({ currentGes: 5 });
        expect(gate.evaluate('slave-1', 7)).toBe('WAITING');
    });

    it('returns STALE when command GES is older or equal', () => {
        registry.getState.mockReturnValue({ currentGes: 5 });
        expect(gate.evaluate('slave-1', 5)).toBe('STALE');
        expect(gate.evaluate('slave-1', 4)).toBe('STALE');
    });

    it('startWatchdog triggers callback on timeout', async () => {
        const onTimeout = vi.fn();
        gate.startWatchdog('slave-1', 7, 100, onTimeout);
        
        await vi.advanceTimersByTimeAsync(150);
        
        expect(onTimeout).toHaveBeenCalled();
    });

    it('cancelWatchdog prevents callback', async () => {
        const onTimeout = vi.fn();
        gate.startWatchdog('slave-1', 7, 100, onTimeout);
        
        gate.cancelWatchdog('slave-1');
        await vi.advanceTimersByTimeAsync(150);
        
        expect(onTimeout).not.toHaveBeenCalled();
    });
});
