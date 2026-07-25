import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EpochGate } from '../resolution/EpochGate.mjs';
import featureFlags from '../FeatureFlags.mjs';

describe('Phase 5 — Task 5.1: EpochGate', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({ LI_EPOCH_GATING: true });
    });

    afterEach(() => {
        featureFlags.resetForTesting();
    });

    it('should initialize epochs at 0 and increment correctly', () => {
        const gate = new EpochGate();
        expect(gate.getCurrentEpoch('browser-1')).toBe(0);

        const val = gate.incrementEpoch('browser-1', 'http://example.com/login');
        expect(val).toBe(1);
        expect(gate.getCurrentEpoch('browser-1')).toBe(1);

        const record = gate.getEpochRecord('browser-1');
        expect(record.url).toBe('http://example.com/login');
        expect(record.value).toBe(1);
        expect(record.timestamp).toBeGreaterThan(0);
    });

    it('should return PROCEED when LI_EPOCH_GATING is disabled', () => {
        featureFlags.resetForTesting({ LI_EPOCH_GATING: false });
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1'); // slave at epoch 1
        expect(gate.evaluate('browser-1', 0).decision).toBe('PROCEED');
        expect(gate.evaluate('browser-1', 5).decision).toBe('PROCEED');
    });

    it('should return PROCEED for legacy commands or epoch 0', () => {
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1'); // slave at epoch 1
        expect(gate.evaluate('browser-1', 0).decision).toBe('PROCEED');
        expect(gate.evaluate('browser-1', undefined).decision).toBe('PROCEED');
        expect(gate.evaluate('browser-1', null).decision).toBe('PROCEED');
    });

    it('should return PROCEED when command epoch matches slave epoch', () => {
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1'); // slave at epoch 1
        gate.incrementEpoch('browser-1'); // slave at epoch 2
        const res = gate.evaluate('browser-1', 2);
        expect(res.decision).toBe('PROCEED');
    });

    it('should return SKIP when command epoch is behind slave epoch', () => {
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1');
        gate.incrementEpoch('browser-1'); // slave at epoch 2
        const res = gate.evaluate('browser-1', 1);
        expect(res.decision).toBe('SKIP');
        expect(res.reason).toContain('is behind');
    });

    it('should return WAIT when command epoch is ahead of slave epoch', () => {
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1'); // slave at epoch 1
        const res = gate.evaluate('browser-1', 2);
        expect(res.decision).toBe('WAIT');
        expect(res.reason).toContain('is ahead');
    });

    it('waitForEpochAlignment should resolve with PROCEED if epoch catches up before timeout', async () => {
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1'); // slave at epoch 1

        // Simulate navigation on slave after 50ms
        setTimeout(() => {
            gate.incrementEpoch('browser-1'); // slave reaches epoch 2
        }, 50);

        const res = await gate.waitForEpochAlignment('browser-1', 2, 500, 20);
        expect(res.decision).toBe('PROCEED');
    });

    it('waitForEpochAlignment should resolve with SKIP if timeout expires', async () => {
        const gate = new EpochGate();
        gate.incrementEpoch('browser-1'); // slave at epoch 1

        const res = await gate.waitForEpochAlignment('browser-1', 2, 100, 20);
        expect(res.decision).toBe('SKIP');
        expect(res.reason).toContain('failed to navigate');
    });
});
