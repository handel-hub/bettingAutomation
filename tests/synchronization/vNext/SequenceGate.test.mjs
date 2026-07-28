import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SequenceGate } from '../../../src/browser/synchronization/SequenceGate.mjs';

describe('SequenceGate', () => {
    let registry;
    let gate;

    beforeEach(() => {
        registry = {
            getState: vi.fn()
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

    it('evaluateAsync resolves ALIGNED when aligned', async () => {
        registry.getState.mockReturnValue({ currentGes: 5 });
        const resultPromise = gate.evaluateAsync('slave-1', 6, 1000);
        await vi.advanceTimersByTimeAsync(0);
        const result = await resultPromise;
        expect(result.status).toBe('ALIGNED');
    });

    it('evaluateAsync waits and resolves when state updates', async () => {
        registry.getState.mockReturnValue({ currentGes: 5 });
        
        const resultPromise = gate.evaluateAsync('slave-1', 7, 1000);
        
        // Wait 100ms, then state updates
        await vi.advanceTimersByTimeAsync(100);
        registry.getState.mockReturnValue({ currentGes: 6 });
        
        // Wait another 50ms (polling interval)
        await vi.advanceTimersByTimeAsync(50);
        
        const result = await resultPromise;
        expect(result.status).toBe('ALIGNED');
    });

    it('evaluateAsync resolves TIMEOUT if deadline exceeded', async () => {
        registry.getState.mockReturnValue({ currentGes: 5 });
        const resultPromise = gate.evaluateAsync('slave-1', 7, 100);
        
        await vi.advanceTimersByTimeAsync(150);
        
        const result = await resultPromise;
        expect(result.status).toBe('TIMEOUT');
    });
});
