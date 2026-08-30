import { logger } from '../../config.mjs';

export class ConstraintEngine {
    /**
     * Evaluates the active policy against live physical constraints (Balance, Odds)
     * and returns a mathematically sound, behaviorally rounded stake, along with a full trace.
     */
    static evaluate(policy, balance, currentOdds = null) {
        const trace = [];
        const snapshot = {
            status: 'UNRESOLVABLE',
            stake: 0,
            trace: trace,
            timestamp: Date.now()
        };

        trace.push(`[INIT] Starting Decision Evaluation. Balance: ${balance}, Odds: ${currentOdds ?? 'N/A'}`);
        trace.push(`[POLICY] Mode: ${policy.Pricing.Strategy.Mode}`);

        let rawStake = 0;

        // 1. MATHEMATICAL SOLVER
        if (policy.Pricing.Strategy.Mode === 'FIXED') {
            rawStake = policy.Pricing.Strategy.BaseStake;
            trace.push(`[MATH] Fixed Mode selected. Raw Stake: ${rawStake}`);
        } else if (policy.Pricing.Strategy.Mode === 'PROFIT_TARGET') {
            if (!currentOdds || currentOdds <= 1.0) {
                trace.push(`[MATH-FAIL] Invalid odds (${currentOdds}) for PROFIT_TARGET mode.`);
                return snapshot;
            }
            
            const target = policy.Pricing.Strategy.TargetProfit;
            // Profit = Stake * (Odds - 1) => Stake = Profit / (Odds - 1)
            rawStake = target / (currentOdds - 1.0);
            trace.push(`[MATH] Target Profit (${target}) / (Odds ${currentOdds} - 1.0) = Raw Stake: ${rawStake.toFixed(2)}`);
        } else {
            trace.push(`[MATH-FAIL] Unknown Pricing Mode: ${policy.Pricing.Strategy.Mode}`);
            return snapshot;
        }

        // 2. CONFLICT RESOLUTION (Balance vs Stake)
        if (rawStake > balance) {
            trace.push(`[CONFLICT] Raw Stake (${rawStake.toFixed(2)}) exceeds Balance (${balance}).`);
            if (policy.Pricing.Strategy.ResolutionStrategy === 'CLAMP_THEN_REDUCE_PROFIT') {
                rawStake = balance;
                const newProfit = rawStake * (currentOdds ? currentOdds - 1.0 : 0);
                trace.push(`[RESOLUTION] CLAMP applied. Stake reduced to Balance (${rawStake}). Projected Profit: ${newProfit.toFixed(2)}`);
                
                if (newProfit < policy.Pricing.Strategy.MinimumAcceptableProfit) {
                    trace.push(`[RESOLUTION-FAIL] Projected profit (${newProfit.toFixed(2)}) is below MinimumAcceptableProfit (${policy.Pricing.Strategy.MinimumAcceptableProfit}).`);
                    return snapshot;
                }
            } else {
                trace.push(`[RESOLUTION-FAIL] Strategy is ABORT. Insufficient funds.`);
                return snapshot;
            }
        }

        // 3. BEHAVIORAL SELECTION & GRANULARITY
        const increment = policy.Pricing.Behavior.PlatformIncrement;
        // Snap to increment (e.g. 1.0)
        let roundedStake = Math.floor(rawStake / increment) * increment;
        
        if (policy.Pricing.Behavior.SelectionPreference === 'ROUND_NUMBERS') {
            // For testing: basic rounding implementation
            roundedStake = Math.round(rawStake / increment) * increment;
        }
        
        trace.push(`[BEHAVIOR] Applied PlatformIncrement (${increment}) and Preference (${policy.Pricing.Behavior.SelectionPreference}). Final Stake: ${roundedStake}`);

        if (roundedStake <= 0) {
            trace.push(`[BEHAVIOR-FAIL] Rounded stake is 0 or negative.`);
            return snapshot;
        }

        // 4. HARD LIMIT ENFORCEMENT
        if (roundedStake > policy.RiskManagement.Policy.MaxStake) {
            trace.push(`[LIMIT-FAIL] Stake (${roundedStake}) exceeds MaxStake (${policy.RiskManagement.Policy.MaxStake}).`);
            return snapshot;
        }

        trace.push(`[SUCCESS] Candidate Stake ${roundedStake} authorized for execution.`);
        snapshot.status = 'AUTHORIZED';
        snapshot.stake = roundedStake;
        return snapshot;
    }
}
