import { describe, it, expect } from 'vitest';
import { SimilarityScore } from '../models/SimilarityScore.mjs';

describe('SimilarityScore', () => {
    it('should initialize with default weights and calculate score', () => {
        const score = new SimilarityScore({
            tagMatch: 1.0,      // * 0.20 = 0.20
            idMatch: 1.0,       // * 0.20 = 0.20
            textMatch: 0.5,     // * 0.20 = 0.10
            classMatch: 1.0,    // * 0.10 = 0.10
            attributeMatch: 1.0,// * 0.10 = 0.10
            hierarchyMatch: 0.0,// * 0.10 = 0.00
            semanticMatch: 1.0, // * 0.05 = 0.05
            positionMatch: 1.0  // * 0.05 = 0.05
        }); // sum = 0.80

        expect(score.overallScore).toBe(0.8000);
        expect(score.isMatch(0.70)).toBe(true);
        expect(score.isMatch(0.85)).toBe(false);
    });

    it('should force overallScore to 0 when rejection reasons are added', () => {
        const score = new SimilarityScore({ tagMatch: 1.0, idMatch: 1.0 });
        expect(score.overallScore).toBeGreaterThan(0);

        score.addRejectionReason('TAG_MISMATCH: Expected BUTTON got DIV');
        expect(score.overallScore).toBe(0.0);
        expect(score.isMatch(0.10)).toBe(false);
        expect(score.rejectionReasons.length).toBe(1);
    });

    it('should serialize and deserialize correctly', () => {
        const score = new SimilarityScore({ tagMatch: 0.9, textMatch: 0.8 });
        score.addRejectionReason('MISMATCH');

        const serialized = score.serialize();
        const deserialized = SimilarityScore.deserialize(serialized);

        expect(deserialized.overallScore).toBe(0.0);
        expect(deserialized.rejectionReasons).toEqual(['MISMATCH']);
        expect(deserialized.dimensions.tagMatch).toBe(0.9);
    });
});
