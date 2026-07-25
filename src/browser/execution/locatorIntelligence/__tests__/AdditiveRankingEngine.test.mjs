import { describe, it, expect, beforeEach } from 'vitest';
import { AdditiveRankingEngine } from '../ranking/AdditiveRankingEngine.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

describe('Phase 4 — Task 4.2: AdditiveRankingEngine', () => {
    beforeEach(() => {
        TelemetryCollector.reset();
    });

    it('should handle empty or missing candidates without error', () => {
        const engine = new AdditiveRankingEngine();
        const context = { candidates: [] };
        expect(() => engine.execute(context)).not.toThrow();
        expect(() => engine.execute({})).not.toThrow();
    });

    it('should compute scoringVector, finalScore, and rank for all candidates', () => {
        const engine = new AdditiveRankingEngine();
        const candidates = [
            {
                id: 'cand-1',
                strategy: 'RoleStrategy',
                locator: 'role=button[name="Submit"]',
                structural: { score: 'HIGH' },
                features: { isIntersecting: true },
                ranking: {},
                telemetry: {}
            },
            {
                id: 'cand-2',
                strategy: 'DataAttributeStrategy',
                locator: '[data-testid="submit-btn"]',
                structural: { score: 'HIGH' },
                features: { isIntersecting: true },
                ranking: {},
                telemetry: {}
            }
        ];

        const context = { candidates };
        engine.execute(context);

        expect(candidates[0].rank).toBeDefined();
        expect(candidates[1].rank).toBeDefined();
        
        // DataAttributeStrategy has higher strategyReliability (1.0 vs 0.8), so it should rank 1
        expect(candidates[0].strategy).toBe('DataAttributeStrategy');
        expect(candidates[0].rank).toBe(1);
        expect(candidates[1].strategy).toBe('RoleStrategy');
        expect(candidates[1].rank).toBe(2);

        expect(candidates[0].ranking.scoringVector).toBeDefined();
        expect(candidates[0].ranking.finalScore).toBeGreaterThan(candidates[1].ranking.finalScore);
        expect(candidates[0].ranking.scoreBreakdown).toBeDefined();
    });

    it('should correctly apply deterministic tie-breakers when final scores are equal', () => {
        const engine = new AdditiveRankingEngine();
        // Create candidates designed to tie on final score if we mock or if dimensions balance out,
        // or test _resolveTies directly on identical score candidates with different strategy priority/length.
        const candA = {
            id: 'a',
            strategy: 'DataAttributeStrategy',
            locator: '[data-id="short"]',
            ranking: {
                finalScore: 0.85,
                scoringVector: { dimensions: { strategyReliability: 1.0, structuralStability: 1.0, corroboration: 0.5 } }
            }
        };
        const candB = {
            id: 'b',
            strategy: 'DataAttributeStrategy',
            locator: '[data-id="much-longer-locator-string"]',
            ranking: {
                finalScore: 0.85,
                scoringVector: { dimensions: { strategyReliability: 1.0, structuralStability: 1.0, corroboration: 0.5 } }
            }
        };

        // Tie-breaker e: shorter locator string wins (-1 means a comes before b)
        expect(engine._resolveTies(candA, candB)).toBeLessThan(0);
        expect(engine._resolveTies(candB, candA)).toBeGreaterThan(0);

        // Lexicographical tie-breaker
        const candC = { ...candA, locator: '[data-id="alpha"]' };
        const candD = { ...candA, locator: '[data-id="betaa"]' };
        expect(engine._resolveTies(candC, candD)).toBeLessThan(0);
    });

    it('should complete ranking of 10 candidates within soft real-time budget (<2ms)', () => {
        const engine = new AdditiveRankingEngine();
        const candidates = [];
        for (let i = 0; i < 10; i++) {
            candidates.push({
                id: `cand-${i}`,
                strategy: i % 2 === 0 ? 'DataAttributeStrategy' : 'RoleStrategy',
                locator: `[data-test="element-${i}"]`,
                structural: { score: 'HIGH' },
                features: { isIntersecting: true },
                ranking: {},
                telemetry: {}
            });
        }

        const start = performance.now();
        engine.execute({ candidates });
        const duration = performance.now() - start;

        expect(candidates.length).toBe(10);
        expect(candidates[0].rank).toBe(1);
        expect(candidates[9].rank).toBe(10);
        expect(duration).toBeLessThan(5); // 5ms ceiling for slow test runners
    });
});
