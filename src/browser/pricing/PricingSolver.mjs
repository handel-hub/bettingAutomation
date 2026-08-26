/**
 * Mathematical Solver for the Autonomous Pricing Edge-Compute Subsystem.
 * Operates purely on integers (cents) to avoid floating point anomalies.
 * 
 * @param {Object} obs - The MarketObservation
 * @param {boolean} obs.marketSuspended
 * @param {number} [obs.platformMax] - in cents
 * @param {number} [obs.platformMin] - in cents
 * @param {number} obs.balance - in cents
 * @param {number} obs.odds - decimal multiplier (float)
 * @param {number} obs.currencyIncrement - in cents
 * 
 * @param {Object} pol - The Policy
 * @param {number} pol.maxStake - in cents
 * @param {number} [pol.minStake] - in cents
 * @param {number} pol.targetProfit - in cents
 * @param {number} pol.minAcceptableProfit - in cents
 * @param {string} pol.resolutionStrategy - 'CLAMP' | 'REDUCE_PROFIT'
 * 
 * @returns {number[]} Array of discrete candidate stakes (in cents)
 */
export function solve(obs, pol) {
    if (obs.marketSuspended) {
        return [];
    }

    // 1. Calculate Absolute Bounds
    const platformMax = obs.platformMax ?? Number.MAX_SAFE_INTEGER;
    const platformMin = obs.platformMin ?? 0;
    
    const UB = Math.min(pol.maxStake, obs.balance, platformMax);
    const LB = Math.max(pol.minStake || 0, platformMin);

    if (UB < LB) {
        return []; // Unresolvable physical constraint
    }

    if (obs.odds <= 1.0) {
        return []; // Mathematically invalid odds
    }

    // 2. Calculate Required Stake for Target Profit
    // reqStake is calculated dynamically. Profit = Stake * (Odds - 1)
    const multiplier = obs.odds - 1.0;
    const reqStake = Math.ceil(pol.targetProfit / multiplier);

    let continuousMin = 0;
    let continuousMax = 0;

    // 3. Feasibility & Resolution
    if (reqStake <= UB) {
        // Feasible: We can reach the target profit without violating bounds
        continuousMin = Math.max(reqStake, LB);
        continuousMax = UB;
    } else {
        // Infeasible: Resolution Required
        if (pol.resolutionStrategy === 'CLAMP' || pol.resolutionStrategy === 'REDUCE_PROFIT') {
            // Both strategies force the stake to the absolute physical maximum
            continuousMin = UB;
            continuousMax = UB;
        } else {
            return []; // Unknown resolution strategy
        }
        
        // 4. Post-Resolution Validation (Minimum Acceptable Profit)
        const projectedProfit = Math.floor(continuousMin * multiplier);
        if (projectedProfit < pol.minAcceptableProfit) {
            return []; // Hard floor violated. Abort calculation.
        }
        if (continuousMin < LB) {
            return []; // Resolution fell below physical lower bound
        }
    }

    // 5. Discrete Candidate Generation
    const candidates = [];
    const inc = obs.currencyIncrement;
    
    if (!inc || inc <= 0) {
        return [];
    }

    // Find first multiple of `inc` >= continuousMin
    let current = Math.ceil(continuousMin / inc) * inc;
    
    while (current <= continuousMax) {
        candidates.push(current);
        current += inc;
    }

    return candidates;
}
