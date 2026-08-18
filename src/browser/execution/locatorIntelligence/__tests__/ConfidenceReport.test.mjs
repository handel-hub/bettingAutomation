import { describe, it, expect } from 'vitest';
import { ConfidenceReport } from '../models/ConfidenceReport.mjs';

describe('ConfidenceReport', () => {
    it('should initialize with valid defaults and clamp confidence', () => {
        const rep = new ConfidenceReport({
            decision: 'ACCEPT',
            confidence: 1.4,
            interactionType: 'input',
            thresholdApplied: 0.50,
            winningCandidate: { id: 'lc-123', strategy: 'DataAttribute' }
        });

        expect(rep.decision).toBe('ACCEPT');
        expect(rep.confidence).toBe(1.0);
        expect(rep.isAcceptable()).toBe(true);
        expect(rep.winningCandidate.id).toBe('lc-123');
    });

    it('should correctly report unacceptability for REJECT decisions', () => {
        const rep = new ConfidenceReport({
            decision: 'REJECT',
            confidence: 0.30,
            thresholdApplied: 0.45,
            reason: 'Confidence below click threshold'
        });

        expect(rep.isAcceptable()).toBe(false);
        expect(rep.reason).toContain('below click threshold');
    });

    it('should serialize and deserialize cleanly', () => {
        const rep = new ConfidenceReport({
            decision: 'TENTATIVE',
            confidence: 0.42,
            thresholdApplied: 0.40,
            allScores: [{ candidateId: 'lc-1', similarityScore: 0.42 }]
        });

        const serialized = rep.serialize();
        const deserialized = ConfidenceReport.deserialize(serialized);

        expect(deserialized.decision).toBe('TENTATIVE');
        expect(deserialized.confidence).toBe(0.42);
        expect(deserialized.allScores.length).toBe(1);
        expect(deserialized.isAcceptable()).toBe(true);
    });
});
