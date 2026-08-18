import { describe, it, expect } from 'vitest';
import { ScoringWeights } from '../ranking/ScoringWeights.mjs';
import { NormalizedBaseScoreRule } from '../ranking/RankingRules/NormalizedBaseScoreRule.mjs';
import { NormalizedDynamicContentRule } from '../ranking/RankingRules/NormalizedDynamicContentRule.mjs';
import { NormalizedStructuralRule } from '../ranking/RankingRules/NormalizedStructuralRule.mjs';
import { NormalizedSpecificityRule } from '../ranking/RankingRules/NormalizedSpecificityRule.mjs';
import { NormalizedCorroborationRule } from '../ranking/RankingRules/NormalizedCorroborationRule.mjs';
import { NormalizedVisibilityRule } from '../ranking/RankingRules/NormalizedVisibilityRule.mjs';
import { ScoringVector } from '../models/ScoringVector.mjs';

describe('Phase 4 — Task 4.1: ScoringWeights & Normalized Ranking Rules', () => {
    describe('ScoringWeights', () => {
        it('should initialize with default weights summing to 1.0', () => {
            const weights = new ScoringWeights();
            const map = weights.toMap();
            const sum = Object.values(map).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0);
            expect(weights.get('strategyReliability')).toBe(0.30);
            expect(weights.get('structuralStability')).toBe(0.15);
        });

        it('should throw an error if weight overrides do not sum to 1.0', () => {
            expect(() => new ScoringWeights({ strategyReliability: 0.90 })).toThrow(/must sum to 1.0/);
        });

        it('should allow valid overrides that sum to 1.0', () => {
            const weights = new ScoringWeights({
                strategyReliability: 0.40,
                structuralStability: 0.05
            });
            expect(weights.get('strategyReliability')).toBe(0.40);
            expect(weights.get('structuralStability')).toBe(0.05);
        });
    });

    describe('Normalized Ranking Rules', () => {
        it('NormalizedBaseScoreRule should map strategies to [0, 1]', () => {
            const rule = new NormalizedBaseScoreRule();
            expect(rule.evaluate({ strategy: 'DataAttributeStrategy' }).score).toBe(1.0);
            expect(rule.evaluate({ strategy: 'RoleStrategy' }).score).toBe(0.80);
            expect(rule.evaluate({ strategy: 'StructuralStrategy' }).score).toBe(0.30);
            expect(rule.evaluate({ strategy: 'Unknown' }).score).toBe(0.10);
        });

        it('NormalizedDynamicContentRule should output inverted risk in [0, 1]', () => {
            const rule = new NormalizedDynamicContentRule();
            const clean = rule.evaluate({ locator: 'button.submit-btn' });
            expect(clean.score).toBe(1.0);

            const uuid = rule.evaluate({ locator: '[data-id="123e4567-e89b-12d3-a456-426614174000"]' });
            expect(uuid.score).toBe(0.2); // 30 penalty -> 0.2 score
        });

        it('NormalizedStructuralRule should output stability in [0, 1]', () => {
            const rule = new NormalizedStructuralRule();
            expect(rule.evaluate({ structural: { score: 'HIGH' } }).score).toBe(1.0);
            expect(rule.evaluate({ structural: { score: 'MEDIUM' } }).score).toBe(0.9);
            expect(rule.evaluate({ structural: { score: 'LOW' } }).score).toBe(0.5);
        });

        it('NormalizedSpecificityRule should output specificity in [0, 1]', () => {
            const rule = new NormalizedSpecificityRule();
            expect(rule.evaluate({ locator: '#user-id' }).score).toBe(1.0);
            expect(rule.evaluate({ locator: 'div > span' }).score).toBe(0.5);
            expect(rule.evaluate({ locator: '*' }).score).toBe(0.3);
        });

        it('NormalizedCorroborationRule should output agreement in [0, 1]', () => {
            const rule = new NormalizedCorroborationRule();
            expect(rule.evaluate({ generatedBy: ['a', 'b', 'c'] }).score).toBe(1.0);
            expect(rule.evaluate({ generatedBy: ['a', 'b'] }).score).toBe(0.8);
            expect(rule.evaluate({ generatedBy: ['a'] }).score).toBe(0.5);
        });

        it('NormalizedVisibilityRule should output visibility in [0, 1]', () => {
            const rule = new NormalizedVisibilityRule();
            expect(rule.evaluate({ features: { isIntersecting: true } }).score).toBe(1.0);
            expect(rule.evaluate({ features: { isIntersecting: false } }).score).toBe(0.5);
        });
    });

    describe('ScoringVector Integration', () => {
        it('should compute aggregate score using ScoringWeights and rule outputs', () => {
            const weights = new ScoringWeights();
            const baseRule = new NormalizedBaseScoreRule();
            const structRule = new NormalizedStructuralRule();

            const cand = { strategy: 'DataAttributeStrategy', structural: { score: 'HIGH' } };
            const baseRes = baseRule.evaluate(cand);
            const structRes = structRule.evaluate(cand);

            const vec = new ScoringVector(
                {
                    [baseRes.dimension]: baseRes.score,
                    [structRes.dimension]: structRes.score,
                    dynamicContentRisk: 1.0,
                    specificity: 1.0,
                    corroboration: 1.0,
                    visibility: 1.0,
                    contextSimilarity: 0.0 // not available yet
                },
                weights.toMap()
            );

            // 0.30(1.0) + 0.15(1.0) + 0.15(1.0) + 0.10(1.0) + 0.15(1.0) + 0.05(1.0) + 0.10(0.0) = 0.90
            // Normalized by weight sum 1.0 = 0.9000
            expect(vec.aggregateScore).toBeCloseTo(0.9000);
        });
    });
});
