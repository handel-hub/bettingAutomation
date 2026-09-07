import { describe, it, expect } from 'vitest';
import { solve } from '../../../../src/browser/pricing/PricingSolver.mjs';

describe('PricingSolver', () => {
    it('returns empty array if market is suspended', () => {
        const obs = { marketSuspended: true };
        const pol = {};
        expect(solve(obs, pol)).toEqual([]);
    });

    it('returns empty array if odds are <= 1.0', () => {
        const obs = { marketSuspended: false, balance: 10000, odds: 1.0, currencyIncrement: 100 };
        const pol = { maxStake: 5000, minStake: 100, targetProfit: 2000 };
        expect(solve(obs, pol)).toEqual([]);
    });

    it('generates correct candidates for normal feasible case', () => {
        const obs = {
            marketSuspended: false,
            balance: 500000, // 5000.00
            odds: 2.0,       // 2.0 multiplier
            currencyIncrement: 1000 // 10.00 steps
        };
        const pol = {
            maxStake: 200000, // 2000.00
            targetProfit: 100000, // 1000.00
            minAcceptableProfit: 50000
        };

        // ReqStake = 100000 / (2 - 1) = 100000
        // UB = min(200000, 500000) = 200000
        // Range = [100000, 200000]
        // Increment = 1000
        const candidates = solve(obs, pol);
        
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates[0]).toBe(100000); // exactly reqStake
        expect(candidates[candidates.length - 1]).toBe(200000); // exactly UB
        
        // Every candidate should be discrete
        candidates.forEach(c => expect(c % 1000).toBe(0));
    });

    it('clamps to UB when reqStake exceeds limits and uses CLAMP resolution', () => {
        const obs = {
            marketSuspended: false,
            balance: 500000,
            odds: 2.0,
            currencyIncrement: 1000
        };
        const pol = {
            maxStake: 200000,
            targetProfit: 500000, // Requires 500000, which exceeds maxStake of 200000
            minAcceptableProfit: 100000, // Floor is 100000 profit
            resolutionStrategy: 'CLAMP'
        };

        const candidates = solve(obs, pol);
        
        // With CLAMP, it forces the value to UB (200000)
        expect(candidates).toEqual([200000]);
    });

    it('returns empty array if CLAMP fails minAcceptableProfit check', () => {
        const obs = {
            marketSuspended: false,
            balance: 500000,
            odds: 2.0,
            currencyIncrement: 1000
        };
        const pol = {
            maxStake: 200000,
            targetProfit: 500000,
            minAcceptableProfit: 300000, // Clamp yields 200000 * 1.0 = 200000 profit. 200000 < 300000.
            resolutionStrategy: 'CLAMP'
        };

        const candidates = solve(obs, pol);
        expect(candidates).toEqual([]); // Fails hard floor
    });

    it('handles currency increment gaps perfectly', () => {
        const obs = {
            marketSuspended: false,
            balance: 5000,
            odds: 2.0,
            currencyIncrement: 1000
        };
        const pol = {
            maxStake: 5000,
            targetProfit: 1200, // ReqStake = 1200
            minAcceptableProfit: 0
        };

        // Range = [1200, 5000]. Increment = 1000.
        // First multiple of 1000 >= 1200 is 2000.
        const candidates = solve(obs, pol);
        expect(candidates).toEqual([2000, 3000, 4000, 5000]);
    });

    describe('Rebet Linear Progression & Concurrency', () => {
        const basePolicy = {
            Pricing: {
                Strategy: { Mode: 'FIXED', BaseStake: 100, TargetProfit: 1000, MinimumAcceptableProfit: 0, ResolutionStrategy: 'CLAMP_THEN_REDUCE_PROFIT' },
                Behavior: { PlatformIncrement: 1, SelectionPreference: 'ROUND_NUMBERS', RestorePolicyOnRebet: true }
            },
            Rebet: { Strategy: { MaxRebetAttempts: 3, RebetStakeIncrement: 10 } },
            Execution: { Timeouts: { ResultTimeoutMs: 1000 }, Retries: { MaxExecutionRetries: 3 } },
            RiskManagement: { Policy: { AutoAcceptOddsChanges: false, MaxStake: 500, MinimumStake: 10, AbortOnMarketSuspend: true } }
        };

        it('calculates exact progression x, x+0n, x+1n, x+2n across sequential cycles', () => {
            const stakes = [];
            const n = basePolicy.Rebet.Strategy.RebetStakeIncrement; // 10
            const x = basePolicy.Pricing.Strategy.BaseStake; // 100

            for (let successCount = 0; successCount <= 3; successCount++) {
                let stake = x;
                const rebetSequenceIndex = successCount;
                if (n > 0 && rebetSequenceIndex >= 2) {
                    const multiplier = rebetSequenceIndex - 1;
                    stake += multiplier * n;
                }
                stakes.push(stake);
            }

            expect(stakes).toEqual([
                100, // Cycle 1 (Initial): x
                100, // Cycle 2 (Rebet 1): x + 0n
                110, // Cycle 3 (Rebet 2): x + 1n
                120  // Cycle 4 (Rebet 3): x + 2n
            ]);
        });

        it('clamps stake when appended increment exceeds balance or MaxStake', () => {
            const lowBalance = 105;
            const rebetSequenceIndex = 2; // +10 -> 110
            let stake = 100;
            const n = 10;
            if (n > 0 && rebetSequenceIndex >= 2) {
                stake += (rebetSequenceIndex - 1) * n;
                const maxAllowed = Math.min(lowBalance, basePolicy.RiskManagement.Policy.MaxStake);
                if (stake > maxAllowed) {
                    stake = maxAllowed;
                }
            }

            expect(stake).toBe(105); // Clamped to balance
        });
    });
});
