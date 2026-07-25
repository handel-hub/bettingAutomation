import { describe, it, expect } from 'vitest';
import { ScoringVector } from '../models/ScoringVector.mjs';

describe('ScoringVector', () => {
    it('should initialize with default weights and zero dimensions', () => {
        const vec = new ScoringVector();
        expect(vec.dimensions.uniqueness).toBe(0.0);
        expect(vec.weights.uniqueness).toBe(0.35);
        expect(vec.aggregateScore).toBe(0.0);
    });

    it('should calculate weighted aggregate score accurately', () => {
        const vec = new ScoringVector({
            uniqueness: 1.0,  // * 0.35 = 0.35
            stability: 0.8,   // * 0.25 = 0.20
            resilience: 0.5,  // * 0.20 = 0.10
            performance: 1.0, // * 0.10 = 0.10
            specificity: 0.5  // * 0.10 = 0.05
        }); // sum = 0.80

        expect(vec.aggregateScore).toBe(0.8000);
    });

    it('should clamp values between 0.0 and 1.0', () => {
        const vec = new ScoringVector({ uniqueness: 1.5, stability: -0.5 });
        expect(vec.dimensions.uniqueness).toBe(1.0);
        expect(vec.dimensions.stability).toBe(0.0);

        vec.addBonus('uniqueness', 0.5);
        expect(vec.dimensions.uniqueness).toBe(1.0);

        vec.applyPenalty('resilience', 0.5);
        expect(vec.dimensions.resilience).toBe(0.0);
    });

    it('should record breakdown explanations for bonuses and penalties', () => {
        const vec = new ScoringVector({ uniqueness: 0.5 });
        vec.addBonus('uniqueness', 0.2, 'TestBonusRule', 'Bonus for test');
        vec.applyPenalty('uniqueness', 0.1, 'TestPenaltyRule', 'Penalty for test');

        expect(vec.dimensions.uniqueness).toBeCloseTo(0.6);
        expect(vec.breakdown['uniqueness:TestBonusRule']).toBeDefined();
        expect(vec.breakdown['uniqueness:TestBonusRule'].action).toBe('BONUS');
        expect(vec.breakdown['uniqueness:TestPenaltyRule'].action).toBe('PENALTY');
    });

    it('should serialize and deserialize identically', () => {
        const vec = new ScoringVector({ uniqueness: 0.9, stability: 0.7 });
        vec.addBonus('resilience', 0.4, 'Rule1');

        const serialized = vec.serialize();
        const deserialized = ScoringVector.deserialize(serialized);

        expect(deserialized.aggregateScore).toBe(vec.aggregateScore);
        expect(deserialized.dimensions).toEqual(vec.dimensions);
        expect(deserialized.breakdown).toEqual(vec.breakdown);
    });
});
