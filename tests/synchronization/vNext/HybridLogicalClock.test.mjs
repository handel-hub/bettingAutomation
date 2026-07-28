import { describe, it, expect, vi } from 'vitest';
import { HybridLogicalClock } from '../../../src/common/models/HybridLogicalClock.mjs';

describe('HybridLogicalClock', () => {
    it('generates a valid HLC from scratch', () => {
        const hlc = HybridLogicalClock.generate();
        expect(hlc.physical).toBeGreaterThan(0);
        expect(hlc.logical).toBe(0);
    });

    it('increments logical clock if physical time is identical', () => {
        const base = new HybridLogicalClock(1700000000000.123, 0);
        
        vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(1700000000000);
        vi.spyOn(performance, 'now').mockReturnValue(0.12345); // Truncates to .123
        
        const next = HybridLogicalClock.generate(base);
        expect(next.physical).toBe(1700000000000.123);
        expect(next.logical).toBe(1);
    });

    it('forces physical time forward if clock goes backwards', () => {
        const base = new HybridLogicalClock(1700000000000.123, 5);
        
        vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(1600000000000);
        vi.spyOn(performance, 'now').mockReturnValue(0);
        
        const next = HybridLogicalClock.generate(base);
        expect(next.physical).toBe(1700000000000.123);
        expect(next.logical).toBe(6);
    });

    it('compares correctly', () => {
        const a = new HybridLogicalClock(100, 0);
        const b = new HybridLogicalClock(100, 1);
        const c = new HybridLogicalClock(101, 0);

        expect(HybridLogicalClock.compare(a, b)).toBeLessThan(0);
        expect(HybridLogicalClock.compare(b, a)).toBeGreaterThan(0);
        expect(HybridLogicalClock.compare(a, a)).toBe(0);
        expect(HybridLogicalClock.compare(b, c)).toBeLessThan(0);
    });
});
