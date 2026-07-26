import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceGate, ConfidenceDecision } from '../resolution/ConfidenceGate.mjs';

describe('ConfidenceGate (Phase 8)', () => {
    let gate;

    beforeEach(() => {
        gate = new ConfidenceGate();
    });

    it('should evaluate CLICK threshold (0.45) correctly', () => {
        const rej = gate.evaluate(0.10, 'click');
        expect(rej.decision).toBe('REJECT');
        expect(rej.isAcceptable()).toBe(false);
        expect(rej.reason).toContain('far below threshold');
        
        const rec = gate.evaluate(0.35, 'click');
        expect(rec.decision).toBe('RECOVER');
        expect(rec.isAcceptable()).toBe(false);
        expect(rec.reason).toContain('slightly below threshold');

        const tent = gate.evaluate(0.47, 'click');
        expect(tent.decision).toBe('TENTATIVE');
        expect(tent.isAcceptable()).toBe(true);
        expect(tent.reason).toContain('marginally exceeds threshold');

        const acc = gate.evaluate(0.60, 'click');
        expect(acc.decision).toBe('ACCEPT');
        expect(acc.isAcceptable()).toBe(true);
        expect(acc.reason).toContain('firmly exceeds threshold');
    });

    it('should evaluate HOVER threshold (0.10) correctly', () => {
        const acc = gate.evaluate(0.15, 'hover');
        expect(acc.decision).toBe('ACCEPT');
        expect(acc.thresholdApplied).toBe(0.10);
    });

    it('should evaluate INPUT threshold (0.50) correctly', () => {
        const rej = gate.evaluate(0.48, 'input');
        expect(rej.decision).toBe('RECOVER');
        expect(rej.thresholdApplied).toBe(0.50);

        const acc = gate.evaluate(0.58, 'fill');
        expect(acc.decision).toBe('ACCEPT');
        expect(acc.thresholdApplied).toBe(0.50);
    });

    it('should evaluate unknown interaction type against default threshold (0.50)', () => {
        const rej = gate.evaluate(0.40, 'unknown_action');
        expect(rej.decision).toBe('RECOVER');
        expect(rej.thresholdApplied).toBe(0.50);

        const acc = gate.evaluate(0.56, null);
        expect(acc.decision).toBe('ACCEPT');
        expect(acc.thresholdApplied).toBe(0.50);
    });

    it('should treat NaN, null, and undefined confidence as REJECT', () => {
        expect(gate.evaluate(NaN, 'click').decision).toBe('REJECT');
        expect(gate.evaluate(null, 'click').decision).toBe('REJECT');
        expect(gate.evaluate(undefined, 'click').decision).toBe('REJECT');
        expect(gate.evaluate(-0.5, 'click').decision).toBe('REJECT');
    });

    it('should normalize 0-100 scale scores to 0.0-1.0 scale', () => {
        const acc = gate.evaluate(60.0, 'click');
        expect(acc.confidence).toBe(0.60);
        expect(acc.decision).toBe('ACCEPT');

        const tent = gate.evaluate(47.0, 'click');
        expect(tent.confidence).toBe(0.47);
        expect(tent.decision).toBe('TENTATIVE');
    });

    it('should extract confidence from object inputs (SimilarityScore or ranking objects)', () => {
        const simScore = { overallScore: 0.60 };
        expect(gate.evaluate(simScore, 'click').decision).toBe('ACCEPT');

        const rankObj = { finalScore: 47.0 };
        expect(gate.evaluate(rankObj, 'click').decision).toBe('TENTATIVE');

        const confObj = { confidence: 0.10 };
        expect(gate.evaluate(confObj, 'click').decision).toBe('REJECT');
    });

    it('should allow custom threshold overrides via config', () => {
        const customGate = new ConfidenceGate({
            thresholds: {
                CLICK: 0.70,
                DEFAULT: 0.80
            }
        });

        expect(customGate.evaluate(0.65, 'click').decision).toBe('RECOVER');
        expect(customGate.evaluate(0.45, 'click').decision).toBe('REJECT');
        expect(customGate.evaluate(0.72, 'click').decision).toBe('TENTATIVE');
        expect(customGate.evaluate(0.78, 'click').decision).toBe('ACCEPT');
        expect(customGate.evaluate(0.65, 'unknown').decision).toBe('RECOVER');
    });

    it('should serialize cleanly to JSON', () => {
        const decision = gate.evaluate(0.47, 'click');
        const json = decision.toJSON();
        expect(json.decision).toBe('TENTATIVE');
        expect(json.confidence).toBe(0.47);
        expect(json.threshold).toBe(0.45);
        expect(json.margin).toBe(0.02);
        expect(json.interactionType).toBe('CLICK');
    });
});
